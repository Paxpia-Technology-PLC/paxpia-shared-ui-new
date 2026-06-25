// anim.ts — the SHARED overlay animation primitives (STREAM G2). One copy of the
// count-up + bar-fill + pulse animation logic, written so it behaves IDENTICALLY on
// react-native-web (web, under Vite) and React Native (mobile, under Metro).
//
// WHY THIS FILE EXISTS (the web↔mobile divergence it kills):
// The participation bars used to animate `width` by interpolating an Animated.Value to
// PERCENTAGE-STRING outputs (`['0%','100%']`). On rn-web 0.19 an animated %-string width
// is resolved differently than RN's native layout (rn-web writes the interpolated string
// to the DOM `style.width` each frame; RN lays it out against the parent each frame) — so
// the SAME vote landing produced a subtly different fill length / easing curve on the two
// platforms. Worse, a 0%→p% fill on a sub-pixel track rounds differently (CSS keeps the
// fraction; RN floors), so a "50%" bar could read 49% vs 50% across platforms.
//
// THE FIX: never animate a %-string. We measure the track once with `onLayout` (identical
// API on both) and animate the fill in PIXELS — a numeric Animated.Value applied to a
// numeric `width`. A numeric width animation is driven the SAME way on rn-web and RN
// (both JS-driver, both write a px number), so the bar grows with the same length + the
// same easing on both. The COUNT-UP and PULSE helpers are likewise plain JS-driver
// Animated, so the displayed number ticks up and the bar flashes identically everywhere.
//
// All hooks use `useNativeDriver: false` deliberately: `width` is a layout prop (the
// native driver can't animate it) and the count-up is read in JS to render text. Pulse is
// a boolean state flip (no driver) so it can't differ across platforms at all.

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, type LayoutChangeEvent } from 'react-native';

/** Smoothly count a displayed number toward `target`. easeOutCubic so increments feel
 *  snappy. The Animated value is read in JS (useNativeDriver:false) to render text — the
 *  SAME driver on rn-web + RN, so the tick rate matches. Seeds at `target` so the first
 *  mount shows the real number with no spurious roll-up (web/mobile parity). */
export function useCountUp(target: number, ms = 450): number {
  const [shown, setShown] = useState(target);
  const anim = useRef(new Animated.Value(target)).current;
  const shownRef = useRef(target);
  shownRef.current = shown;
  useEffect(() => {
    if (target === shownRef.current) return;
    anim.setValue(shownRef.current);
    const id = anim.addListener(({ value }) => setShown(Math.round(value)));
    const a = Animated.timing(anim, {
      toValue: target,
      duration: ms,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    a.start();
    return () => {
      a.stop();
      anim.removeListener(id);
    };
    // Only re-run when the TARGET changes (shown read via ref, not a dep).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ms]);
  return shown;
}

/** True briefly right after `count` INCREASES — drives the pulse when a vote lands. A
 *  plain boolean state flip (no Animated, no driver) so the pulse window is byte-identical
 *  on web + mobile. */
export function usePulse(count: number, ms = 500): boolean {
  const prev = useRef(count);
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (count > prev.current) {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), ms);
      prev.current = count;
      return () => clearTimeout(t);
    }
    prev.current = count;
  }, [count, ms]);
  return pulsing;
}

/** The result of {@link useBarFill}: an `onTrackLayout` to put on the TRACK view, and an
 *  animated `width` (in PIXELS) to put on the FILL view. Measuring the track + animating
 *  px is what makes the fill grow IDENTICALLY on rn-web and RN (no %-string interpolation,
 *  which the two platforms resolve differently). */
export interface BarFill {
  /** Put on the track `View.onLayout` — captures the track's pixel width. */
  onTrackLayout: (e: LayoutChangeEvent) => void;
  /** Put on the fill `Animated.View` as `{ width }` — an animated PIXEL width. */
  width: Animated.AnimatedInterpolation<number> | number;
}

/** Animate a fill bar to `p` percent (0–100) of its measured track, in PIXELS.
 *
 *  The fill width = trackWidth * p/100, animated as a numeric Animated.Value (NOT an
 *  interpolated %-string). Because the value is a plain number applied to `width`, rn-web
 *  and RN drive it the same way and the bar reaches the same length with the same easing
 *  on both — the centering/justification of the fill within the track no longer drifts.
 *
 *  Until the track has been measured (first frame), width is the static fraction of a
 *  best-effort 0 so nothing flashes full-width; once measured the animation takes over. */
export function useBarFill(p: number, ms = 500): BarFill {
  const [trackW, setTrackW] = useState(0);
  const target = (Math.max(0, Math.min(100, p)) / 100) * trackW;
  const anim = useRef(new Animated.Value(target)).current;
  const targetRef = useRef(target);
  targetRef.current = target;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && w !== trackW) setTrackW(w);
  };

  // Re-target whenever the percentage OR the measured track width changes (a resize must
  // re-fit the fill so it stays p% of the NEW width — identical reflow on both platforms).
  useEffect(() => {
    const a = Animated.timing(anim, {
      toValue: target,
      duration: ms,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    a.start();
    return () => a.stop();
  }, [target, ms, anim]);

  return { onTrackLayout, width: trackW > 0 ? anim : 0 };
}
