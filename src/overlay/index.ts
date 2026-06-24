// @paxpia/ui — overlay view layer (Task E). The ONE cross-platform overlay/doc/SVG
// component set (rn-web), consuming the @paxpia/core model + the injected LeafAdapter.
export { OverlayRenderer } from './OverlayRenderer';
export type { OverlayRendererProps } from './OverlayRenderer';
export { ParticipationOverlay, PollOverlay, QuizOverlay, VoteButtonOverlay } from './ParticipationOverlay';
export { DocOverlay } from './DocOverlay';
export type { DocOverlayProps, DocAnnotationLayerProps } from './DocOverlay';
export { DocChrome } from './DocChrome';
export type { DocChromeProps } from './DocChrome';
export { WhiteboardOverlay } from './WhiteboardOverlay';
export type { WhiteboardOverlayProps } from './WhiteboardOverlay';
export { WhiteboardChrome, WB_COLORS, WB_WIDTHS } from './WhiteboardChrome';
export type { WhiteboardChromeProps, WhiteboardRole, WhiteboardRailPlacement } from './WhiteboardChrome';
export { SvgOverlayLayer } from './SvgOverlayLayer';
export type { SvgOverlayLayerProps, SvgOverlaySource, SvgHostProps } from './SvgOverlayLayer';
export { GiftOverlayLayer, GIFT_TOAST_TTL_MS, GIFT_VISIBLE_CAP } from './GiftOverlayLayer';
export type { GiftOverlayLayerProps } from './GiftOverlayLayer';
export { LiveSurface } from './LiveSurface';
export type { LiveSurfaceProps } from './LiveSurface';
export type { LeafAdapter, ImageLeafProps, WebViewHostProps } from './LeafAdapter';
