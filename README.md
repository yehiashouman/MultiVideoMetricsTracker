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
  - Percentage elapsed  
  - Percentage of unique seconds viewed  
  - Total watch time  
  - Unique seconds actually visible on screen  
  - Video duration  
  - Current time  
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

### 5. Get metrics directly from code
```js
const video = document.querySelector('video');
console.log(tracker.getMetrics(video)); // returns metrics object

console.log(tracker.getAllMetrics()); // returns [{video, metrics}, ...]
```

### 6. Stop tracking
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
  percentage_elapsed,                // Max viewed second / duration
  percentage_unique_seconds_viewed,  // Percentage of video actually viewed = (Unique seconds watched / video duration  (without repetition and with video within viewport and tab is active))
  watch_time_sec,                    // Total watch time including rewinds
  on_screen_sec,                     // Unique playback seconds where video is within viewport and visible
  duration_sec,                      // Video duration
  current_time_sec                   // Current time in video
}
```
## License
GPL-3.0 license


  
