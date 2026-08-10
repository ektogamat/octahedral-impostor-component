export default function Overlay({
  showImpostors,
  wireframe,
  impostorCount,
  scaleVariance,
  onToggleImpostors,
  onToggleWireframe,
  onImpostorCountChange,
  onScaleVarianceChange,
  statsRef,
}) {
  return (
    <>
      <div ref={statsRef} className="demo-main-stats">
        <div>
          Triangles <span data-stat="triangles">—</span>
        </div>
        <div>
          Draw calls <span data-stat="drawcalls">—</span>
        </div>
      </div>

      <div className="demo-slider-bar">
        <label className="demo-slider-label" htmlFor="impostor-count-slider">
          Impostors
          <span className="demo-slider-value">{impostorCount}</span>
        </label>
        <input
          id="impostor-count-slider"
          className="demo-slider-input"
          type="range"
          min={2}
          max={1000}
          step={1}
          value={impostorCount}
          onChange={(event) =>
            onImpostorCountChange(Number(event.target.value))
          }
        />

        <label className="demo-slider-label" htmlFor="scale-variance-slider">
          Scale variance
          <span className="demo-slider-value">
            {Math.round(scaleVariance * 100)}%
          </span>
        </label>
        <input
          id="scale-variance-slider"
          className="demo-slider-input"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={scaleVariance}
          onChange={(event) =>
            onScaleVarianceChange(Number(event.target.value))
          }
        />
      </div>

      <div className="demo-controls-bar">
        <button
          className="demo-control-button"
          data-active={showImpostors}
          onClick={onToggleImpostors}
          type="button"
        >
          Show Impostors
        </button>
        <button
          className="demo-control-button"
          data-active={wireframe}
          onClick={onToggleWireframe}
          type="button"
        >
          Wireframe
        </button>
      </div>
    </>
  );
}
