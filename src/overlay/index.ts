// @paxpia/ui — overlay view layer (Task E). The ONE cross-platform overlay/doc/SVG
// component set (rn-web), consuming the @paxpia/core model + the injected LeafAdapter.
export { OverlayRenderer } from './OverlayRenderer';
export type { OverlayRendererProps } from './OverlayRenderer';
export { ParticipationOverlay, PollOverlay, QuizOverlay, VoteButtonOverlay } from './ParticipationOverlay';
export { DocOverlay } from './DocOverlay';
export type { DocOverlayProps } from './DocOverlay';
export { DocChrome } from './DocChrome';
export type { DocChromeProps } from './DocChrome';
export { WhiteboardOverlay } from './WhiteboardOverlay';
export type { WhiteboardOverlayProps } from './WhiteboardOverlay';
export { WhiteboardChrome, WB_COLORS, WB_WIDTHS } from './WhiteboardChrome';
export type { WhiteboardChromeProps } from './WhiteboardChrome';
export { SvgOverlayLayer } from './SvgOverlayLayer';
export type { SvgOverlayLayerProps, SvgOverlaySource, SvgHostProps } from './SvgOverlayLayer';
export { LiveSurface } from './LiveSurface';
export type { LiveSurfaceProps } from './LiveSurface';
export type { LeafAdapter, ImageLeafProps, WebViewHostProps } from './LeafAdapter';
