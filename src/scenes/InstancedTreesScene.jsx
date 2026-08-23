import { useMemo } from "react";
import { OrbitControls } from "@react-three/drei";
import { useImpostorSourceMesh } from "../impostor/CoconutTreeMesh";
import InstancedTreeField from "../impostor/InstancedTreeField";

const SCENE_BG = "#e4e4e8";

export default function InstancedTreesScene({ treeCount = 1 }) {
  const meshData = useImpostorSourceMesh("/tree_low-poly.glb");

  const treeScale = useMemo(() => {
    if (!meshData) return 1;
    const targetHeight = 6;
    return targetHeight / Math.max(meshData.height, 0.001);
  }, [meshData]);

  const worldHeight = (meshData?.height ?? 1) * treeScale;
  const lookAtY = worldHeight * 0.45;

  return (
    <>
      <color attach="background" args={[SCENE_BG]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[8, 12, 6]} intensity={1.1} />
      <directionalLight position={[-4, 6, -3]} intensity={0.35} />

      <perspectiveCamera
        makeDefault
        position={[0, worldHeight * 1.1, worldHeight * 1.45]}
        fov={36}
        near={0.1}
        far={300}
        onUpdate={(camera) => camera.lookAt(0, lookAtY, 0)}
      />

      <InstancedTreeField
        meshData={meshData}
        treeScale={treeScale}
        count={treeCount}
        scaleVariance={0.12}
      />

      <OrbitControls
        makeDefault
        target={[0, lookAtY, 0]}
        minDistance={worldHeight * 0.85}
        maxDistance={worldHeight * 20}
        maxPolarAngle={Math.PI * 0.48}
        minPolarAngle={0.25}
        enableDamping
        enablePan={false}
        dampingFactor={0.08}
      />
    </>
  );
}
