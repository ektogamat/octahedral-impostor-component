import { useEffect, useState } from "react";

export const MIN_TREES = 1;
export const MAX_TREES = 15000;
export const RISE_DURATION = 16;
export const HOLD_DURATION = 6;
export const FALL_DURATION = 16;
export const MIN_FPS = 10;
export const MAX_FPS = 60;
export const TRIS_PER_TREE = 850;

function easeInQuad(t) {
  return t * t;
}

function easeOutQuad(t) {
  const inv = 1 - t;
  return 1 - inv * inv;
}

/** Stays near 60 until load builds, then drops sharply — mimics GPU-bound scenes. */
function fakeFpsFromTreeCount(treeCount, elapsedMs) {
  const load = Math.max(
    0,
    Math.min(1, (treeCount - MIN_TREES) / (MAX_TREES - MIN_TREES)),
  );
  const stress = Math.pow(load, 2.6);
  let fps = MAX_FPS - stress * (MAX_FPS - MIN_FPS);

  const wobble =
    Math.sin(elapsedMs * 0.0041) * (0.6 + stress * 2.2) +
    Math.sin(elapsedMs * 0.019) * 0.45;
  fps += wobble;

  return Math.round(Math.max(MIN_FPS, Math.min(MAX_FPS, fps)));
}

function getTimelineState(elapsedMs) {
  const riseMs = RISE_DURATION * 1000;
  const holdMs = HOLD_DURATION * 1000;
  const fallMs = FALL_DURATION * 1000;
  const cycleMs = riseMs + holdMs + fallMs;
  const t = elapsedMs % cycleMs;

  let progress;
  let phase;

  if (t < riseMs) {
    progress = easeInQuad(t / riseMs);
    phase = "rising";
  } else if (t < riseMs + holdMs) {
    progress = 1;
    phase = "hold";
  } else {
    const fallT = (t - riseMs - holdMs) / fallMs;
    progress = 1 - easeOutQuad(fallT);
    phase = "falling";
  }

  const treeCount = Math.round(
    MIN_TREES + progress * (MAX_TREES - MIN_TREES),
  );
  const fakeFps = fakeFpsFromTreeCount(treeCount, elapsedMs);
  const triangleCount = treeCount * TRIS_PER_TREE;

  return {
    treeCount,
    fakeFps,
    triangleCount,
    progress,
    phase,
  };
}

export default function useRecordingTimeline() {
  const [state, setState] = useState(() => getTimelineState(0));

  useEffect(() => {
    const start = performance.now();
    let frameId = 0;

    const tick = () => {
      setState(getTimelineState(performance.now() - start));
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return state;
}
