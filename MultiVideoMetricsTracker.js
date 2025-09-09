/**
 * MultiVideoMetricsTracker
 *
 * Tracks playback metrics for multiple video elements in real time.
 * Reports events such as time watched, fullscreen toggles, and user engagement,
 * at configurable intervals. Supports automatic setup from selector, NodeList, or single video element.
 *
 * Author: Yehia Shouman (info@yehiashouman.com)
 * License: GPL-3.0
 *
 * Usage:
 *   const tracker = new MultiVideoMetricsTracker('video.selector', 1, 'videometrics');
 *
 * Features:
 *   - Tracks play time, watch percentage, and fullscreen state
 *   - Emits events for analytics or custom handlers
 *   - Handles edge cases like skipping, seeking, or fast-forwarding
 *
 * See README.md for detailed integration instructions.
 */
class MultiVideoMetricsTracker {
  constructor(videos, numberOfSeconds = 1, eventName = 'videometrics') {
    this.videoMap = new Map(); // videoElement => state+handlers
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
    videoList.forEach(video => this.addVideo(video));

    [
      'fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'
    ].forEach(eventName => {
      document.addEventListener(eventName, this._handleFullscreen);
    });

    // Stop tracking if tab is hidden
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') {
        this.videoMap.forEach((_, video) => this._stopTracking(video));
      }
    });

    // Auto-remove videos that are deleted from DOM
    this.observer = new MutationObserver(() => {
      this.videoMap.forEach((_, video) => {
        if (!document.body.contains(video)) {
          this.removeVideo(video);
        }
      });
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.session_created_at = new Date();
    this.intervalId = setInterval(this._intervalUpdate, this.intervalSeconds * 1000);
  }
  
  _getInitialMetrics = () => ({
    ff_seek_count: 0,
    rw_seek_count: 0,
    replay_count: 0,
    fs_count: 0,
    unique_viewed_sec: 0,
    percentage_unique_viewed: 0,
    total_watch_time_sec: 0,
    percent_max_progress: 0,
    duration_sec: 0,
    current_time_sec: 0,
    session_time_sec: 0
  });

  addVideo = (video) => {
    if (this.videoMap.has(video)) return; // Already tracked

    // State
    const state = {
      metrics: this._getInitialMetrics(),
      metadata_loaded: 1,
      playedback_unique_seconds: new Set(),
      playedback_max_sec: 0,
      video_visibility: 0,
      lastStart: null,
      playbackTime: 0,
      lastPlaybackTime: 0,
      session_time_start: new Date()
    };

    // Handlers (need to be same ref for removal)
    const onLoadedMetadata = () => { state.metadata_loaded = 1; };
    const onPlay = () => this._startTracking(video);
    const onTimeupdate = () => this._startTracking(video); // Ensures lastStart is set on first timeupdate after play
    const onPause = () => this._stopTracking(video);
    const onEnded = () => this._stopTracking(video);
    const onWaiting = () => this._stopTracking(video);
    const onSeeking = () => this._trackSeeks(video);
    const onReplayPlay = () => this._checkReplay(video);
    const onReplaySeeked = () => this._checkReplay(video);

    // Attach
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('play', onPlay);
    video.addEventListener('timeupdate', onTimeupdate);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('play', onReplayPlay);
    video.addEventListener('seeked', onReplaySeeked);

    // Save state + handlers
    this.videoMap.set(video, {
      ...state,
      handlers: {
        onLoadedMetadata, onPlay, onTimeupdate, onPause, onEnded, onWaiting, onSeeking, onReplayPlay, onReplaySeeked
      }
    });
  };

  removeVideo = (video) => {
    const state = this.videoMap.get(video);
    if (!state) return;

    const h = state.handlers;
    video.removeEventListener('loadedmetadata', h.onLoadedMetadata);
    video.removeEventListener('play', h.onPlay);
    video.removeEventListener('timeupdate', h.onTimeupdate);
    video.removeEventListener('pause', h.onPause);
    video.removeEventListener('ended', h.onEnded);
    video.removeEventListener('waiting', h.onWaiting);
    video.removeEventListener('seeking', h.onSeeking);
    video.removeEventListener('play', h.onReplayPlay);
    video.removeEventListener('seeked', h.onReplaySeeked);

    this.videoMap.delete(video);
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
    if (state.lastStart === null) {
      state.lastStart = video.currentTime;
    }
  };

  _stopTracking = (video) => {
    const state = this.videoMap.get(video);
    if (state.lastStart !== null) {
      const delta = video.currentTime - state.lastStart;
      if (delta > 0) state.playbackTime += delta;
      state.metrics.total_watch_time_sec = state.playbackTime;
      state.lastStart = null;
    }
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

  _checkReplay = (video) => {
    const state = this.videoMap.get(video);
    if (
      state.lastPlaybackTime !== undefined &&
      state.lastPlaybackTime > 1 &&
      video.currentTime < 1
    ) {
      state.metrics.replay_count++;
    }
    state.lastPlaybackTime = video.currentTime;
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
          state.metrics.unique_viewed_sec = state.playedback_unique_seconds.size;
          state.metrics.percentage_unique_viewed =
            (state.metrics.unique_viewed_sec > 0 && state.metrics.duration_sec > 0)
              ? Number((state.metrics.unique_viewed_sec / state.metrics.duration_sec).toFixed(2)) : 0;
          state.metrics.percent_max_progress =
            (state.playedback_max_sec > 0 && state.metrics.duration_sec > 0)
              ? Number((state.playedback_max_sec / state.metrics.duration_sec).toFixed(2)) : 0;
            state.metrics.session_time_sec = Number(((new Date()- state.session_time_start)/1000).toFixed(2));
          
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
  destroy = () => {
    clearInterval(this.intervalId);
    if (this.observer) this.observer.disconnect();
    this.videoMap.forEach((_, video) => this.removeVideo(video));
  };
}
