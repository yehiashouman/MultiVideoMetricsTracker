# MultiVideoMetricsTracker

A modern JavaScript ES6+ class for **tracking multiple HTML5 videos** on any page.  
Provides rich video engagement metrics (seek counts, watch time, unique seconds viewed, fullscreen events, etc) for each tracked video, and dispatches a **custom event with current metrics every N seconds**.

## Features

- Track any number of videos (auto state per video)
- Clean ES6+ style, no dependencies
- Customizable interval and event name
- Emits a `CustomEvent` (default: `videometrics`) on each video with current metrics in `.detail.metrics`
- Metrics tracked:  
  - Forward/reverse seek count  
  - Replay count  
  - Fullscreen count  
  - Percentage of Max progress 
  - Percentage of unique seconds viewed
  - Total watch time 
  - Unique seconds actually visible on screen 
  - Video duration  
  - Current time
  - Session Time
- Easily get all tracked metrics from JS

---

## Usage

### 1. Add to your project

```js
// Paste MultiVideoMetricsTracker.js class code in your project or import it
const tracker = new MultiVideoMetricsTracker(document.querySelectorAll('video'), 2, 'videometrics');
// (track all <video> elements, dispatch event every 2 seconds, event name is 'videometrics')
```

### 2. Track all videos on the page
```js
const tracker = new MultiVideoMetricsTracker(document.querySelectorAll('video'), 2, 'videometrics');
// (track all <video> elements, dispatch event every 2 seconds, event name is 'videometrics')
```

### 3. Listen for metrics events
```js
document.querySelectorAll('video').forEach(video => {
  video.addEventListener('videometrics', e => {
    // e.detail.metrics contains current metrics for this video
    console.log('Metrics for video:', video, e.detail.metrics);
  });
});
```

### 4. Track by selector or single video
```js
const tracker = new MultiVideoMetricsTracker('video.tracked', 1); // selector string
// or
const tracker = new MultiVideoMetricsTracker(document.querySelector('#mainVideo'));
```


### 5. Dynamically Add a Video
You can add a new video element to tracking at any time:
```js
const video = document.createElement('video');
document.body.appendChild(video);
tracker.addVideo(video);
```

### 6. Remove a Video from Tracking
> **Note:**
> You can remove a video from tracking and clean up all associated event listeners:
> If a tracked video element is removed from the DOM (e.g., by calling video.remove() or manipulating the DOM),
> the class will automatically stop tracking it and clean up all event listeners.
> This is handled internally with a MutationObserver.
> You do not need to call removeVideo in most cases.
```js
tracker.removeVideo(video);
```


### 7. Get metrics directly from code
```js
const video = document.querySelector('video');
console.log(tracker.getMetrics(video)); // returns metrics object

console.log(tracker.getAllMetrics()); // returns [{video, metrics}, ...]
```


### 8. Stop tracking
To stop all tracking, interval timers, observers, and listeners, call:
```js
tracker.destroy();
```

## Constructor
```js
new MultiVideoMetricsTracker(videos, numberOfSeconds = 1, eventName = 'videometrics')
//videos: NodeList, array of HTMLVideoElements, a CSS selector string, or a single video element
//numberOfSeconds: Interval in seconds between metric events (default 1)
//eventName: Custom event name (default 'videometrics')
```

## Metrics object
```js
{
  ff_seek_count,                     // Forward seek action count
  rw_seek_count,                     // Reverse seek action count
  replay_count,                      // (not yet used)
  fs_count,                          // Entering Fullscreen mode count
  percent_max_progress,                // Furthest progress in the video (Can happen even by skipping) / duration
  percentage_unique_viewed,  // Percentage of seconds of the video actually viewed = (Unique seconds watched / video duration  (unique seconds are counted one time and with video within viewport and tab is active))
  total_watch_time_sec,                    // Total watch time including rewinded segments
  unique_viewed_sec,                     // Unique playback seconds where video is within viewport and visible (counted one time regardless of replay)
  duration_sec,                      // Video duration
  current_time_sec,                   // Current time in video,
  session_time_sec                     //Since tracker is tracking video (usually as page is loaded)
}
```
## License
This project is licensed under the GNU General Public License v3.0 (GPL‑3.0).  
See the full text of the license here: [GNU GPL v3](https://www.gnu.org/licenses/gpl-3.0.en.html)

  
