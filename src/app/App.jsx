import { useCallback, useRef, useState } from "react";
import ImpostorCanvas from "../canvas/ImpostorCanvas";
import Overlay from "./Overlay";
import InfoOverlay from "./InfoOverlay";
import useAllTracksReady from "../impostor/useAllTracksReady";
import "./impostor-demo.css";

export default function App() {
  const [showImpostors, setShowImpostors] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [impostorCount, setImpostorCount] = useState(2);
  const [scaleVariance, setScaleVariance] = useState(0.15);

  const atlasViewRef = useRef(null);
  const rigViewRef = useRef(null);
  const mainViewRef = useRef(null);
  const layoutRef = useRef(null);
  const statsRef = useRef(null);

  const viewsReady = useAllTracksReady(atlasViewRef, rigViewRef, mainViewRef);

  const handleToggleImpostors = useCallback(() => {
    setShowImpostors((value) => !value);
  }, []);

  const handleToggleWireframe = useCallback(() => {
    setWireframe((value) => !value);
  }, []);

  return (
    <div className="impostor-demo-root">
      <div ref={layoutRef} className="impostor-demo-layout">
        <div className="impostor-demo-left">
          <div className="impostor-view-panel">
            <div ref={atlasViewRef} className="impostor-view-track" />
          </div>
          <div className="impostor-view-panel">
            <div ref={rigViewRef} className="impostor-view-track" />
          </div>
        </div>

        <div className="impostor-demo-right">
          <div className="impostor-view-panel impostor-view-panel--main">
            <div ref={mainViewRef} className="impostor-view-track" />
            <Overlay
              showImpostors={showImpostors}
              wireframe={wireframe}
              impostorCount={impostorCount}
              scaleVariance={scaleVariance}
              onToggleImpostors={handleToggleImpostors}
              onToggleWireframe={handleToggleWireframe}
              onImpostorCountChange={setImpostorCount}
              onScaleVarianceChange={setScaleVariance}
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
          wireframe={wireframe}
          impostorCount={impostorCount}
          scaleVariance={scaleVariance}
          statsElementRef={statsRef}
        />
      )}

      <InfoOverlay />
    </div>
  );
}
