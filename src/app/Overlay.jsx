import { DEMO_MODELS } from "../impostor/demoModels";

export default function Overlay({
  showImpostors,
  showBillboards,
  wireframe,
  impostorCount,
  scaleVariance,
  modelId,
  onToggleImpostors,
  onToggleBillboards,
  onToggleWireframe,
  onImpostorCountChange,
  onScaleVarianceChange,
  onModelIdChange,
  statsRef,
}) {
  return (
    <>
      <label className="demo-model-picker" htmlFor="demo-model-select">
        <span className="demo-model-picker-label">Model</span>
        <select
          id="demo-model-select"
          className="demo-model-select"
          value={modelId}
          onChange={(event) => onModelIdChange(event.target.value)}
        >
          {DEMO_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}
        </select>
      </label>

      <div ref={statsRef} className="demo-main-stats">
        <div className="demo-main-stats-row">
          <span>Triangles</span>
          <span data-stat="triangles">—</span>
        </div>
        <div className="demo-main-stats-row">
          <span>Draw calls</span>
          <span data-stat="drawcalls">—</span>
        </div>
        <div className="demo-main-stats-row">
          <span>Model tris</span>
          <span data-stat="model">—</span>
        </div>
        <div className="demo-main-stats-row">
          <span>As mesh</span>
          <span data-stat="asmesh">—</span>
        </div>
        <div className="demo-main-stats-row demo-main-stats-row--accent">
          <span>Avoided</span>
          <span data-stat="avoided">—</span>
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
          Impostor
        </button>
        <button
          className="demo-control-button"
          data-active={showBillboards}
          onClick={onToggleBillboards}
          type="button"
        >
          Billboard
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
