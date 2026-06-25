// @paxpia/ui — overlay view layer (Task E). The ONE cross-platform overlay/doc/SVG
// component set (rn-web), consuming the @paxpia/core model + the injected LeafAdapter.
export { OverlayRenderer } from './OverlayRenderer';
export type { OverlayRendererProps } from './OverlayRenderer';
// STREAM G2 — the shared cross-platform overlay animation primitives (count-up / pulse /
// measured-px bar fill) the participation overlays build on. Exported so any future overlay
// reuses the SAME rn-web↔RN-identical animation (no %-string width interpolation).
export { useCountUp, usePulse, useBarFill } from './anim';
export type { BarFill } from './anim';
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
// StreamStatus (#9) — the ONE shared room-status screen for {not-found, offline, error}
// (+ connecting/reconnecting/unavailable), Retry + Go-home, modelled off core's RoomStatus.
export { StreamStatus } from './StreamStatus';
export type { StreamStatusProps, StreamStatusKind } from './StreamStatus';
export type { LeafAdapter, ImageLeafProps, WebViewHostProps } from './LeafAdapter';
