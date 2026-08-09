import { useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import OctahedralImpostor from "../OctahedralImpostor";
import { CoconutTreeModel } from "../CoconutTreeMesh";
import { useImpostorDemo, DEMO_GRID_SIZE } from "../impostorDemoStore";
import { sampleOctahedralDirection } from "../utils/octahedralImpostorMath";

function MainSamplingDriver({ targetCenter }) {
  const { camera } = useThree();
  const indicesRef = useRef(new THREE.Vector3());
  const weightsRef = useRef(new THREE.Vector3());
  const viewDir = useRef(new THREE.Vector3());
  const sampleDir = useRef(new THREE.Vector3());
  const { samplingCache, activeSampleRef } = useImpostorDemo();

  useFrame(() => {
    if (!samplingCache || !activeSampleRef) return;

    viewDir.current.copy(camera.position).sub(targetCenter).normalize();
    sampleDir.current.copy(viewDir.current);
    // Soft floor so hemi sampling stays in the captured upper hemisphere
    // without the old hard 0.08 clamp that warped horizon azimuth.
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

/**
 * Bake fits the largest AABB axis into ~0.72 of the ortho frame (±0.5).
 * Plane size = that frame in world units so sprite scale matches the mesh.
 */
function getBakeFrameWorldSize(meshData, treeScale) {
  const sx = meshData?.size?.x ?? 1;
  const sy = meshData?.size?.y ?? 1;
  const sz = meshData?.size?.z ?? 1;
  const maxDim = Math.max(sx, sy, sz, 0.001);
  const scaleFactor = 0.72 / maxDim;
  return treeScale / scaleFactor;
}

function SideImpostor({
  side,
  worldWidth,
  worldHeight,
  planeSize,
  showImpostors,
  wireframe,
  faceCenter,
}) {
  const { atlas, activeSampleRef } = useImpostorDemo();
  const offsetX = Math.max(worldWidth, planeSize) * 0.85;
  const centerY = worldHeight * 0.5;

  if (!showImpostors || !atlas?.texture) {
    return null;
  }

  return (
    <group position={[side * offsetX, centerY, 0]}>
      <OctahedralImpostor
        atlasPayload={atlas}
        activeSampleRef={activeSampleRef}
        faceCenter={faceCenter}
        gridSize={atlas.gridSize ?? DEMO_GRID_SIZE}
        geometryArgs={[planeSize, planeSize]}
        visible
        wireframe={wireframe}
        alphaTest={0.3}
      />
    </group>
  );
}

export default function MainComparisonView({
  meshData,
  treeScale = 1,
  showImpostors = false,
  wireframe = false,
}) {
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
  return (
    <group>
      <perspectiveCamera
        makeDefault
        position={[0, worldHeight * 0.55, worldHeight * 2.4]}
        fov={38}
        near={0.05}
        far={80}
        onUpdate={(camera) => camera.lookAt(0, worldHeight * 0.45, 0)}
      />

      <MainSamplingDriver targetCenter={targetCenter} />

      <CoconutTreeModel
        meshData={meshData}
        position={[0, 0, 0]}
        scale={treeScale}
        wireframe={wireframe}
      />

      <SideImpostor
        side={-1}
        worldWidth={worldWidth}
        worldHeight={worldHeight}
        planeSize={planeSize}
        showImpostors={showImpostors}
        wireframe={wireframe}
        faceCenter={targetCenter}
      />
      <SideImpostor
        side={1}
        worldWidth={worldWidth}
        worldHeight={worldHeight}
        planeSize={planeSize}
        showImpostors={showImpostors}
        wireframe={wireframe}
        faceCenter={targetCenter}
      />

      <OrbitControls
        makeDefault
        target={[0, worldHeight * 0.45, 0]}
        minDistance={worldHeight * 0.8}
        maxDistance={worldHeight * 9}
        maxPolarAngle={Math.PI * 0.49}
        minPolarAngle={0.12}
        enableDamping
        dampingFactor={0.08}
      />
    </group>
  );
}
