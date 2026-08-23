import { useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useImpostorDemo } from "../impostorDemoStore";
import { sampleOctahedralDirection } from "../utils/octahedralImpostorMath";
import ImpostorField from "../ImpostorField";
import MainViewStats from "../MainViewStats";

function MainSamplingDriver({ targetCenter, enabled = true }) {
  const { camera } = useThree();
  const indicesRef = useRef(new THREE.Vector3());
  const weightsRef = useRef(new THREE.Vector3());
  const viewDir = useRef(new THREE.Vector3());
  const sampleDir = useRef(new THREE.Vector3());
  const { samplingCache, activeSampleRef } = useImpostorDemo();

  useFrame(() => {
    if (!enabled || !samplingCache || !activeSampleRef) return;

    viewDir.current.copy(camera.position).sub(targetCenter).normalize();
    sampleDir.current.copy(viewDir.current);
    if (sampleDir.current.y < 0.001) {
      sampleDir.current.y = 0.001;
      sampleDir.current.normalize();
    }

    const result = sampleOctahedralDirection({
      direction: sampleDir.current,
      cache: samplingCache,
      indicesTarget: indicesRef.current,
      weightsTarget: weightsRef.current,
    });

    if (!result) return;

    activeSampleRef.current = {
      ...result,
      viewDirection: {
        x: viewDir.current.x,
        y: viewDir.current.y,
        z: viewDir.current.z,
      },
    };
  });

  return null;
}

function getBakeFrameWorldSize(meshData, treeScale) {
  const sx = meshData?.size?.x ?? 1;
  const sy = meshData?.size?.y ?? 1;
  const sz = meshData?.size?.z ?? 1;
  const maxDim = Math.max(sx, sy, sz, 0.001);
  const scaleFactor = 1.5 / maxDim;
  return treeScale / scaleFactor;
}

export default function MainComparisonView({
  meshData,
  treeScale = 1,
  showImpostors = false,
  showBillboards = false,
  wireframe = false,
  impostorCount = 2,
  scaleVariance = 0,
  statsElementRef = null,
}) {
  const fieldMode = showImpostors
    ? "impostor"
    : showBillboards
      ? "billboard"
      : "off";
  const worldHeight = (meshData?.height ?? 1) * treeScale;
  const worldWidth =
    Math.max(meshData?.size?.x ?? 1, meshData?.size?.z ?? 1) * treeScale;
  const planeSize = useMemo(
    () => getBakeFrameWorldSize(meshData, treeScale),
    [meshData, treeScale],
  );
  const targetCenter = useMemo(
    () => new THREE.Vector3(0, worldHeight * 0.5, 0),
    [worldHeight],
  );
  const fieldRadius = Math.max(worldWidth, planeSize) * 1.05;
  const fieldCenterY = worldHeight * 0.5;
  // Fixed world extent so density rises with count while the map silhouette stays put.
  const distributionExtent = Math.max(worldHeight * 16, planeSize * 82);
  const distributionArea = useMemo(
    () => [distributionExtent, distributionExtent],
    [distributionExtent],
  );

  return (
    <group>
      <perspectiveCamera
        makeDefault
        position={[0, worldHeight * 0.55, worldHeight * 2.4]}
        fov={38}
        near={0.05}
        far={Math.max(80, distributionExtent * 3)}
        onUpdate={(camera) => camera.lookAt(0, worldHeight * 0.45, 0)}
      />

      <MainSamplingDriver
        targetCenter={targetCenter}
        enabled={!showBillboards}
      />
      <MainViewStats statsElementRef={statsElementRef} />

      {/* <CoconutTreeModel
        meshData={meshData}
        position={[0, 0, 0]}
        scale={treeScale}
        wireframe={wireframe}
      /> */}

      <ImpostorField
        count={impostorCount}
        planeSize={planeSize}
        centerY={fieldCenterY}
        radius={fieldRadius}
        faceCenter={targetCenter}
        scaleVariance={scaleVariance}
        mode={fieldMode}
        wireframe={wireframe}
        distributionTexture="/distribution.jpg"
        // intensity≈1 keeps the soft vignette; 10 flattens smoke into a hard square
        distributionIntensity={0.35}
        distributionContrast={1.8}
        distributionThreshold={0.47}
        areaSize={distributionArea}
        avoidRadius={Math.max(planeSize * 0.5, worldWidth * 0.18)}
        seed={42}
      />

      <OrbitControls
        makeDefault
        target={[0, worldHeight * 0.45, 0]}
        minDistance={worldHeight * 5}
        maxDistance={Math.max(worldHeight * 28, distributionExtent * 1.35)}
        maxPolarAngle={Math.PI * 0.47}
        minPolarAngle={0.12}
        enableDamping
        enablePan={false}
        dampingFactor={0.08}
      />
    </group>
  );
}
