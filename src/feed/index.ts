// @paxpia/ui/feed — the cross-platform WATCH (VOD / short-form) view layer (rn-web):
// VideoGrid (profile thumbnail grid) + WatchFeed (vertical scroll feed with action
// rail; platform injects the player via renderMedia). Pure & props-driven over
// @paxpia/core/feed; the host owns data + the FeedApi + media playback.
export { VideoGrid } from './VideoGrid';
export type { VideoGridProps } from './VideoGrid';
export { WatchFeed } from './WatchFeed';
export type { WatchFeedProps } from './WatchFeed';
