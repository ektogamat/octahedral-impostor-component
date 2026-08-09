export default function Overlay({
  showImpostors,
  wireframe,
  onToggleImpostors,
  onToggleWireframe,
}) {
  return (
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
  );
}
