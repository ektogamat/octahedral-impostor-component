import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { createWebGPURenderer } from "./createWebGPURenderer";
import ImpostorDemoScene from "../scenes/ImpostorDemoScene";

export default function ImpostorCanvas({
  layoutRef,
  atlasViewRef,
  rigViewRef,
  mainViewRef,
  showImpostors,
  showBillboards,
  wireframe,
  impostorCount,
  scaleVariance,
  gridSize,
  modelId,
  statsElementRef,
}) {
  return (
    <Canvas
      className="impostor-canvas"
      dpr={[1, 1.5]}
      gl={createWebGPURenderer}
      eventSource={layoutRef}
      eventPrefix="offset"
    >
      <Suspense fallback={null}>
        <Environment
          files="/hdri/studio_small_09_1k.hdr"
          environmentIntensity={0.55}
        />
        <ImpostorDemoScene
          key={modelId}
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
          statsElementRef={statsElementRef}
        />
      </Suspense>
    </Canvas>
  );
}
