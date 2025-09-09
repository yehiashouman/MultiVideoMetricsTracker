class MultiVideoMetricsTracker {
  constructor(videos, numberOfSeconds = 1, eventName = 'videometrics') {
    this.videoMap = new Map(); // videoElement => state
    this.intervalSeconds = numberOfSeconds;
    this.eventName = eventName;

    let videoList = [];
    if (typeof videos === 'string') {
      videoList = Array.from(document.querySelectorAll(videos));
    } else if (NodeList.prototype.isPrototypeOf(videos) || Array.isArray(videos)) {
      videoList = Array.from(videos);
    } else if (videos instanceof HTMLVideoElement) {
      videoList = [videos];
    }
    videoList.forEach(video => this._initVideo(video));

    [
      'fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'
    ].forEach(eventName => {
      document.addEventListener(eventName, this._handleFullscreen);
    });

    this.intervalId = setInterval(this._intervalUpdate, this.intervalSeconds * 1000);
  }

  _getInitialMetrics = () => ({
    ff_seek_count: 0,
    rw_seek_count: 0,
    replay_count: 0,
    fs_count: 0,
    percentage_elapsed: 0,
    percentage_unique_seconds_viewed: 0,
    watch_time_sec: 0,
    on_screen_sec: 0,
    duration_sec: 0,
    current_time_sec: 0
  });

  _initVideo = (video) => {
    this.videoMap.set(video, {
      metrics: this._getInitialMetrics(),
      metadata_loaded: 0,
      playedback_unique_seconds: new Set(),
      playedback_max_sec: 0,
      video_visibility: 0,
      lastStart: null,
      playbackTime: 0,
      watched_segment: 0
    });

    video.addEventListener('loadedmetadata', () => {
      this.videoMap.get(video).metadata_loaded = 1;
    });
    ['play', 'timeupdate'].forEach(ev =>
      video.addEventListener(ev, () => this._startTracking(video))
    );
    ['pause', 'ended', 'waiting'].forEach(ev =>
      video.addEventListener(ev, () => this._stopTracking(video))
    );
    ['seeking'].forEach(ev =>
      video.addEventListener(ev, () => this._trackSeeks(video))
    );

    // For robustness, set loaded flag
    this.videoMap.get(video).metadata_loaded = 1;
  };

  _isPlaying = (video) =>
    !video.paused && !video.ended && video.currentTime > 0;

  _isInView = (el) => {
    const r = el.getBoundingClientRect();
    const document_visible = document.visibilityState === 'visible';
    return (
      document_visible &&
      r.top < window.innerHeight &&
      r.bottom > 0 &&
      r.left < window.innerWidth &&
      r.right > 0 &&
      !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
    );
  };

  _isVisibleAndPlaying = (video) =>
    this._isInView(video) && this._isPlaying(video);

  _startTracking = (video) => {
    const state = this.videoMap.get(video);
    state.lastStart = video.currentTime;
  };

  _stopTracking = (video) => {
    const state = this.videoMap.get(video);
    state.lastStart = null;
    state.playbackTime += state.watched_segment;
    state.metrics.watch_time_sec = state.playbackTime;
  };

  _trackSeeks = (video) => {
    const state = this.videoMap.get(video);
    if (video.currentTime > state.metrics.current_time_sec) {
      state.metrics.ff_seek_count++;
    }
    if (video.currentTime < state.metrics.current_time_sec) {
      state.metrics.rw_seek_count++;
    }
  };

  _handleFullscreen = () => {
    this.videoMap.forEach((state, video) => {
      const isFull = !!(
        document.fullscreenElement === video ||
        document.webkitFullscreenElement === video ||
        document.mozFullScreenElement === video ||
        document.msFullscreenElement === video
      );
      if (isFull) state.metrics.fs_count++;
    });
  };

  _intervalUpdate = () => {
    this.videoMap.forEach((state, video) => {
      if (state.metadata_loaded) {
        state.metrics.current_time_sec = video.currentTime;
        state.metrics.duration_sec = video.duration > 0 ? video.duration : 0;
        state.playedback_max_sec = Math.max(state.metrics.current_time_sec, state.playedback_max_sec);
        state.video_visibility = this._isVisibleAndPlaying(video);
        if (state.video_visibility) {
          state.playedback_unique_seconds.add(Math.floor(state.metrics.current_time_sec));
          state.metrics.on_screen_sec = state.playedback_unique_seconds.size;
          state.metrics.percentage_unique_seconds_viewed =
            (state.metrics.on_screen_sec > 0 && state.metrics.duration_sec > 0)
              ? Number((state.metrics.on_screen_sec / state.metrics.duration_sec).toFixed(2)) : 0;
          state.metrics.percentage_elapsed =
            (state.playedback_max_sec > 0 && state.metrics.duration_sec > 0)
              ? Number((state.playedback_max_sec / state.metrics.duration_sec).toFixed(2)) : 0;
          state.watched_segment = video.currentTime - state.lastStart;
        }
        // Dispatch a custom event on the video element
        video.dispatchEvent(
          new CustomEvent(this.eventName, {
            detail: {
              metrics: { ...state.metrics },
              video: video
            }
          })
        );
      }
    });
  };

  /** Get all video elements being tracked */
  getVideos = () => Array.from(this.videoMap.keys());

  /** Get metrics for a single video element */
  getMetrics = (video) => this.videoMap.get(video)?.metrics || null;

  /** Get all metrics (returns: [{video, metrics}, ...]) */
  getAllMetrics = () =>
    Array.from(this.videoMap.entries()).map(([video, state]) => ({
      video,
      metrics: state.metrics
    }));

  /** Stop all intervals/cleanup */
  destroy = () => clearInterval(this.intervalId);
}
