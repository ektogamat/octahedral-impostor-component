import { useCallback, useRef, useState } from "react";
import ImpostorCanvas from "../canvas/ImpostorCanvas";
import Overlay from "./Overlay";
import InfoOverlay from "./InfoOverlay";
import useAllTracksReady from "../impostor/useAllTracksReady";
import { DEFAULT_DEMO_MODEL_ID } from "../impostor/demoModels";
import { DEMO_GRID_SIZE } from "../impostor/impostorDemoStore";
import "./impostor-demo.css";

export default function App() {
  const [showImpostors, setShowImpostors] = useState(true);
  const [showBillboards, setShowBillboards] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [impostorCount, setImpostorCount] = useState(2);
  const [scaleVariance] = useState(0.15);
  const [gridSize, setGridSize] = useState(DEMO_GRID_SIZE);
  const [modelId, setModelId] = useState(DEFAULT_DEMO_MODEL_ID);

  const atlasViewRef = useRef(null);
  const rigViewRef = useRef(null);
  const mainViewRef = useRef(null);
  const layoutRef = useRef(null);
  const statsRef = useRef(null);

  const viewsReady = useAllTracksReady(atlasViewRef, rigViewRef, mainViewRef);

  const handleToggleImpostors = useCallback(() => {
    setShowImpostors((value) => {
      const next = !value;
      if (next) setShowBillboards(false);
      return next;
    });
  }, []);

  const handleToggleBillboards = useCallback(() => {
    setShowBillboards((value) => {
      const next = !value;
      if (next) setShowImpostors(false);
      return next;
    });
  }, []);

  const handleToggleWireframe = useCallback(() => {
    setWireframe((value) => !value);
  }, []);

  return (
    <div className="impostor-demo-root">
      <div ref={layoutRef} className="impostor-demo-layout">
        <div className="impostor-demo-left">
          <div
            className={`impostor-view-panel${showBillboards ? " is-inactive" : ""}`}
          >
            <div ref={atlasViewRef} className="impostor-view-track" />
            {showBillboards && (
              <div className="impostor-view-inactive-overlay" aria-hidden="true">
                <span className="impostor-view-inactive-label">Atlas</span>
                <span className="impostor-view-inactive-copy">
                  Unused in billboard mode
                </span>
              </div>
            )}
          </div>
          <div
            className={`impostor-view-panel${showBillboards ? " is-inactive" : ""}`}
          >
            <div ref={rigViewRef} className="impostor-view-track" />
            {showBillboards && (
              <div className="impostor-view-inactive-overlay" aria-hidden="true">
                <span className="impostor-view-inactive-label">Capture rig</span>
                <span className="impostor-view-inactive-copy">
                  Unused in billboard mode
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="impostor-demo-right">
          <div className="impostor-view-panel impostor-view-panel--main">
            <div ref={mainViewRef} className="impostor-view-track" />
            <Overlay
              showImpostors={showImpostors}
              showBillboards={showBillboards}
              wireframe={wireframe}
              impostorCount={impostorCount}
              gridSize={gridSize}
              modelId={modelId}
              onToggleImpostors={handleToggleImpostors}
              onToggleBillboards={handleToggleBillboards}
              onToggleWireframe={handleToggleWireframe}
              onImpostorCountChange={setImpostorCount}
              onGridSizeChange={setGridSize}
              onModelIdChange={setModelId}
              statsRef={statsRef}
            />
          </div>
        </div>
      </div>

      {viewsReady && (
        <ImpostorCanvas
          layoutRef={layoutRef}
          atlasViewRef={atlasViewRef}
          rigViewRef={rigViewRef}
          mainViewRef={mainViewRef}
          showImpostors={showImpostors}
          showBillboards={showBillboards}
          wireframe={wireframe}
          impostorCount={impostorCount}
          scaleVariance={scaleVariance}
          gridSize={gridSize}
          modelId={modelId}
          statsElementRef={statsRef}
        />
      )}

      <InfoOverlay />
    </div>
  );
}
