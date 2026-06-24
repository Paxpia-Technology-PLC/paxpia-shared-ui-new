// @paxpia/ui — social view layer (#2, SHARED-LIFT-BACKLOG §Comments). The shared threaded
// comments panel (rn-web), consuming @paxpia/core/social. Pure & props-driven; the host
// owns the data, identity hydration, optimistic reducers, and transport.
export { CommentsPanel } from './CommentsPanel';
export type { CommentsPanelProps, CommentAuthor, ComposerMode } from './CommentsPanel';
