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
  wireframe,
  impostorCount,
  scaleVariance,
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
          atlasViewRef={atlasViewRef}
          rigViewRef={rigViewRef}
          mainViewRef={mainViewRef}
          showImpostors={showImpostors}
          wireframe={wireframe}
          impostorCount={impostorCount}
          scaleVariance={scaleVariance}
          statsElementRef={statsElementRef}
        />
      </Suspense>
    </Canvas>
  );
}
