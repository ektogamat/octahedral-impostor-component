import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { createWebGPURenderer } from "./createWebGPURenderer";
import InstancedTreesScene from "../scenes/InstancedTreesScene";

export default function TreesCanvas({ layoutRef, treeCount }) {
  return (
    <Canvas
      className="trees-canvas"
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
        <InstancedTreesScene treeCount={treeCount} />
      </Suspense>
    </Canvas>
  );
}
