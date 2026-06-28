// @paxpia/ui/messaging — the cross-platform DM/chat view layer (rn-web): the 8-kind
// MessageRenderer, the ThreadList (conversation list), the ThreadView (chat pane),
// and the MessageComposer. Pure & props-driven over @paxpia/core/messaging; the host
// owns data + transport.
export { MessageRenderer } from './MessageRenderer';
export type { MessageRendererProps } from './MessageRenderer';
export { ThreadList } from './ThreadList';
export type { ThreadListProps } from './ThreadList';
export { ThreadView, MessagesEmptyState } from './ThreadView';
export type { ThreadViewProps } from './ThreadView';
export { MessageComposer } from './MessageComposer';
export type { MessageComposerProps, ComposerReplyTarget } from './MessageComposer';
