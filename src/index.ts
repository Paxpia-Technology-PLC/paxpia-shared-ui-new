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
