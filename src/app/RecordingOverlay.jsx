import { MAX_TREES, MIN_TREES } from "../hooks/useRecordingTimeline";

function lerpColor(from, to, t) {
  const clamped = Math.max(0, Math.min(1, t));
  const parse = (hex) => {
    const value = hex.replace("#", "");
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16),
    ];
  };
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const r = Math.round(r1 + (r2 - r1) * clamped);
  const g = Math.round(g1 + (g2 - g1) * clamped);
  const b = Math.round(b1 + (b2 - b1) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

function getFpsColor(fps) {
  if (fps >= 45) return "#1a1a1e";
  if (fps >= 20) return lerpColor("#1a1a1e", "#cc8800", (45 - fps) / 25);
  return lerpColor("#cc8800", "#dd2222", (20 - fps) / 10);
}

export default function RecordingOverlay({ treeCount, fakeFps, triangleCount }) {
  const sliderProgress =
    (treeCount - MIN_TREES) / Math.max(MAX_TREES - MIN_TREES, 1);

  return (
    <>
      <div className="recording-stats">
        <div className="recording-stat">
          {treeCount.toLocaleString("en-US")} trees
        </div>
        <div className="recording-stat">
          {triangleCount.toLocaleString("en-US")} triangles
        </div>
        <div
          className="recording-stat recording-stat--fps"
          style={{ color: getFpsColor(fakeFps) }}
        >
          {fakeFps} fps
        </div>
      </div>

      <div className="recording-slider-bar">
        <label className="recording-slider-row" htmlFor="tree-count-slider">
          <span className="recording-slider-label">Trees</span>
          <input
            id="tree-count-slider"
            className="recording-slider-input"
            type="range"
            min={MIN_TREES}
            max={MAX_TREES}
            step={1}
            value={treeCount}
            readOnly
            tabIndex={-1}
            style={{
              background: `linear-gradient(to right, #ffcc00 ${sliderProgress * 100}%, rgba(0, 0, 0, 0.12) ${sliderProgress * 100}%)`,
            }}
          />
          <span className="recording-slider-value">
            {treeCount.toLocaleString("en-US")}
          </span>
        </label>
      </div>
    </>
  );
}
