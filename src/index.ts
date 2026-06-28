// @paxpia/ui — Paxpia's cross-platform VIEW layer.
//
// Components are authored ONCE with React Native primitives (View/Text/Pressable/
// Image + StyleSheet). On mobile they render through React Native (Metro). On web
// they render through `react-native-web` (the Vite `react-native` -> `react-native-web`
// alias). This is the view-layer analog of @paxpia/core: the model lives once in
// @paxpia/core, the SHARED chrome lives once here, and each app composes them.
//
// Platform escape hatches: when a component genuinely needs different code per
// platform, add `Foo.web.tsx` (web/Vite) and/or `Foo.native.tsx` (mobile/Metro)
// next to `Foo.tsx`; the bundlers pick the right one via resolve.extensions.
export * from './components';
export * from './theme';
// Overlay view layer (Task E) — the ONE cross-platform overlay/doc/SVG component set,
// consuming @paxpia/core's model + an injected LeafAdapter.
export * from './overlay';
// Entry-gate shell (Task F) — the ONE pre-join loading shell, rendered from GateState.
export * from './gate';
// Gifting view layer (#1, SHARED-LIFT-BACKLOG §Gifting) — GiftPanel + CoinsShop (rn-web),
// consuming @paxpia/core/wallet. Pure presentational; the host owns the sheet + transport.
export * from './gift';
// Social view layer (#2, §Comments) — CommentsPanel (rn-web threaded comments + composer),
// consuming @paxpia/core/social. Props-driven; the host owns data + hydration + transport.
export * from './social';
// Messaging view layer (Stream 1, 2026-06-28) — the 8-kind MessageRenderer + ThreadList +
// ThreadView + MessageComposer (rn-web), consuming @paxpia/core/messaging. Props-driven;
// the host owns data + the MessagingApi + the realtime socket.
export * from './messaging';
// Search view layer (Stream 1) — SearchBar + SearchResults (rn-web), consuming
// @paxpia/core/search. Props-driven; the host owns the SearchApi + navigation.
export * from './search';
// Watch-feed view layer (Stream 1) — VideoGrid + WatchFeed (rn-web), consuming
// @paxpia/core/feed. Props-driven; the host owns the FeedApi + media playback (injected
// via renderMedia so the platform supplies its real video player).
export * from './feed';
