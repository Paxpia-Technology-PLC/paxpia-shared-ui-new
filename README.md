# @paxpia/ui

Paxpia's cross-platform **view layer** — the rendering analog of
[`@paxpia/core`](../paxpia-shared-core/README.md). Components are written **once**
with React Native primitives (`View` / `Text` / `Pressable` / `Image` +
`StyleSheet`) in this package and rendered on **both** clients:

- **mobile** (`Paxpia-mobile`) — natively, through React Native / Metro.
- **web** (`Paxpia-web`) — through [`react-native-web`](https://necolas.github.io/react-native-web/),
  via a Vite `react-native` → `react-native-web` alias.

`@paxpia/core` is the single source of truth for the **domain model**; `@paxpia/ui`
is the single source of truth for **shared chrome**. Each app composes the two and
adds its platform-specific shells (routing, navigation, stores).

Both apps consume this package as **TypeScript source** (no build step), exactly like
`@paxpia/core`: tsconfig `paths` + a Vite alias (web) + a Metro resolver (mobile).

## Layout

```
paxpia-shared-ui/
├── package.json          name: @paxpia/ui · main/types: src/index.ts
├── tsconfig.json         typechecks against the REAL RN types (mobile's react-native/types)
└── src/
    ├── index.ts          barrel (re-exports components + theme)
    ├── theme/
    │   ├── index.ts
    │   └── tokens.ts      framework-free design tokens (colors/radius/spacing/fontSize)
    └── components/
        ├── index.ts
        ├── Pill.tsx       Pill + LiveTag  (badge / red live tag)
        └── Avatar.tsx     circular image with monogram fallback
```

## Proof components (current)

| Component | What it is | Web mount | Mobile mount |
|---|---|---|---|
| `Pill` / `LiveTag` | rounded badge; `LiveTag` is the red "LIVE" preset | `/ui-demo` page | `SettingsScreen` → About → Version row |
| `Avatar` | circular avatar w/ monogram fallback + optional brand ring | `/ui-demo` page | (available; demoed on web) |

These are intentionally **self-contained** (no app store/theme/hook) so they render
anywhere. They are NOT wired into the live/feed/viewer/auth surfaces — those stay
owned by their feature teams until migrated (see below).

## Adding a shared component

1. Create `src/components/Foo.tsx`. Import only from `react-native` and
   `../theme/tokens` (or other `@paxpia/ui` components). **Do not** import an app's
   store, navigation, or platform module — keep it presentational; pass data in via
   props.
2. Use the automatic JSX runtime — no `import React`. Style with `StyleSheet.create`.
3. Export it from `src/components/index.ts` (and it flows out through `src/index.ts`).
4. `npm run typecheck` here to validate against the real RN types.
5. Consume it from either app: `import { Foo } from '@paxpia/ui';`.

## Web / mobile wiring (how it resolves)

### Web — `Paxpia-web`
- `package.json`: `react-native-web` (dependency).
- `vite.config.ts`:
  - alias `react-native` → **absolute** path to `node_modules/react-native-web`
    (absolute so it resolves even when the importer is this out-of-root package).
  - alias `@paxpia/ui` → `../paxpia-shared-ui/src`.
  - `resolve.extensions` lists `.web.tsx`/`.web.ts` **first** (platform overrides win).
  - `define: { __DEV__ }` and `optimizeDeps.include: ['react-native-web']`.
- `tsconfig.json`: `paths["@paxpia/ui"]` → the package `src`.
- `src/types/react-native-web.d.ts`: a small, hand-maintained `declare module 'react-native'`
  shim typed against the web app's **React 18**. RNW 0.19 ships Flow (not `.d.ts`),
  and `@types/react-native-web@0.19.2` is broken (`View` mistyped, `StyleSheet.create`
  missing) while the real RN 0.84 types target React 19 and clash with React 18 JSX.
  The shim covers exactly the RN surface the shared components use; **extend it when
  a component reaches for a new primitive.** (The package itself still typechecks
  against the full real RN types — the shim only satisfies the web compiler.)

### Mobile — `Paxpia-mobile`
- `metro.config.js`:
  - `watchFolders` includes `../paxpia-shared-ui/src` (so Metro reads + hot-reloads it).
  - `resolver.resolveRequest` maps `@paxpia/ui` → `src/index.ts` and `@paxpia/ui/<sub>`
    → `src/<sub>/index.ts` (same scheme as `@paxpia/core`).
  - **react-native / react / @babel/runtime are pinned to the app's single copy**
    when imported from an out-of-root shared package (otherwise Metro can't find them
    from the package, which has no `node_modules`). This also hardens `@paxpia/core`.
- `tsconfig.json`: `paths["@paxpia/ui"]` + `["@paxpia/ui/*"]` → the package `src`.

> Validate the mobile wiring without disturbing a running dev server with a one-shot
> bundle: `npx react-native bundle --platform android --dev true --entry-file index.js
> --bundle-output /tmp/p.bundle --reset-cache`.

## Platform escape hatches

When a component genuinely needs different code per platform, add a sibling file and
let the bundlers pick it:

- `Foo.web.tsx` — web only (Vite `resolve.extensions` puts `.web.*` first).
- `Foo.native.tsx` — mobile only (Metro prefers `.native.*` then `.<platform>.*`).
- `Foo.tsx` — the shared default / fallback.

Keep the **public prop API identical** across variants so call sites don't branch.
Prefer a single shared `Foo.tsx`; reach for `.web`/`.native` only for a genuinely
platform-bound concern (e.g. a DOM-only affordance or a native-only gesture).

## Migration plan (incremental, opt-in)

The goal is *one* implementation of shared chrome, moved over **a component at a time**
— never a big-bang rewrite, and never while a feature team is mid-edit on the file.

1. **Pick a leaf, presentational component** that already exists in BOTH apps with the
   same look (badges, pills, avatars, chips, dividers, empty-states, skeletons,
   buttons). Avoid anything wired to live/feed/viewer/auth until those teams sign off.
2. **Author it here** with RN primitives + tokens; export it. Match the existing prop
   shape so call sites barely change.
3. **Swap web first** (`import { X } from '@paxpia/ui'`), confirm `tsc` + `vite build`.
   Extend `react-native-web.d.ts` if the component used a new RN primitive.
4. **Swap mobile** next; confirm a `--reset-cache` bundle is green and hot-reload works.
5. **Delete the two old copies.** Repeat. As several components share spacing/colors,
   promote those constants into `theme/tokens.ts` (and later a `ThemeProvider` here so
   both apps feed in their light/dark palette instead of components hard-coding it).

Rough order of safe candidates: tokens/`ThemeProvider` → `Button`/`Pill`/`Badge` →
`Avatar`/`VerifiedBadge` → cards & list rows → empty/skeleton states. Heavier,
stateful surfaces (feed tiles, viewer, studio) migrate **last**, after their owners
have settled the Connect-RPC churn.
