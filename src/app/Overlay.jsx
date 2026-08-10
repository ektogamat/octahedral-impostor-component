import { DEMO_MODELS } from "../impostor/demoModels";
import { DEMO_GRID_SIZES } from "../impostor/impostorDemoStore";

export default function Overlay({
  showImpostors,
  showBillboards,
  wireframe,
  impostorCount,
  gridSize,
  modelId,
  onToggleImpostors,
  onToggleBillboards,
  onToggleWireframe,
  onImpostorCountChange,
  onGridSizeChange,
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

      <div className="demo-bottom-left">
        {(showImpostors || showBillboards) && (
          <div className="demo-slider-bar">
            <label className="demo-slider-row" htmlFor="impostor-count-slider">
              <span className="demo-slider-label">Impostors</span>
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
              <span className="demo-slider-value">{impostorCount}</span>
            </label>
          </div>
        )}

        <div
          className="demo-grid-bar"
          role="group"
          aria-label="Atlas grid size"
        >
          <span className="demo-grid-label">Grid</span>
          {DEMO_GRID_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className="demo-grid-button"
              data-active={gridSize === size}
              onClick={() => onGridSizeChange(size)}
            >
              {size}
            </button>
          ))}
        </div>
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
