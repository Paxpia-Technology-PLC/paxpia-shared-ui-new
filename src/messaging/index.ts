// @paxpia/ui/messaging — the cross-platform DM/chat view layer (rn-web): the 8-kind
// MessageRenderer, the ThreadList (conversation list), the ThreadView (chat pane),
// the MessageComposer, the ThreadTabs filter bar, and the group/channel management
// chrome (GroupCreateSheet, MemberManagePanel, ChannelHeader). Pure & props-driven
// over @paxpia/core/messaging; the host owns data + transport. The presentational
// look is folded from the mobile `Chat_Messaging_Camera` branch, theme-tokenized.
export { MessageRenderer } from './MessageRenderer';
export type { MessageRendererProps } from './MessageRenderer';
export { ThreadList } from './ThreadList';
export type { ThreadListProps } from './ThreadList';
export { ThreadView, MessagesEmptyState } from './ThreadView';
export type { ThreadViewProps } from './ThreadView';
export { MessageComposer } from './MessageComposer';
export type { MessageComposerProps, ComposerReplyTarget } from './MessageComposer';
export { ThreadTabs, THREAD_TABS } from './ThreadTabs';
export type { ThreadTabsProps, ThreadTab } from './ThreadTabs';
export { GroupCreateSheet } from './GroupCreateSheet';
export type { GroupCreateSheetProps, GroupCreateResult, MemberCandidate } from './GroupCreateSheet';
export { MemberManagePanel } from './MemberManagePanel';
export type { MemberManagePanelProps } from './MemberManagePanel';
export { ChannelHeader } from './ChannelHeader';
export type { ChannelHeaderProps } from './ChannelHeader';
