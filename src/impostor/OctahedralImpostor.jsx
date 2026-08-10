import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three/webgpu";
import { useFrame, useThree } from "@react-three/fiber";
import {
  applyActiveSampleToMaterial,
  createImpostorAtlasMaterial,
} from "./utils/createImpostorAtlasMaterial";

export default function OctahedralImpostor({
  atlasPayload = null,
  activeSampleRef = null,
  faceCenter = null,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  gridSize = 8,
  geometryArgs = [2, 2],
  alphaTest = 0.25,
  wireframe = false,
  visible = true,
}) {
  const groupRef = useRef(null);
  const billboardRef = useRef(null);
  const { camera } = useThree();

  const nodeMaterial = useMemo(
    () => createImpostorAtlasMaterial(atlasPayload, gridSize, alphaTest),
    [atlasPayload, gridSize, alphaTest],
  );

  useEffect(() => {
    return () => {
      nodeMaterial?.dispose();
    };
  }, [nodeMaterial]);

  const worldPosRef = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!billboardRef.current) return;

    // Orient from the subject center used for atlas sampling (not card position).
    // Offset side impostors otherwise get opposite yaw when viewed from above.
    // YXZ keeps roll=0 so orbiting near zenith does not bank-flip.
    billboardRef.current.getWorldPosition(worldPosRef.current);
    const origin = faceCenter ?? worldPosRef.current;
    const dx = camera.position.x - origin.x;
    const dy = camera.position.y - origin.y;
    const dz = camera.position.z - origin.z;
    const yaw = Math.atan2(dx, dz);
    const pitch = Math.atan2(dy, Math.hypot(dx, dz));
    billboardRef.current.rotation.order = "YXZ";
    billboardRef.current.rotation.set(-pitch, yaw, 0);

    if (wireframe || !nodeMaterial) return;

    const sample = activeSampleRef?.current;
    if (!sample) return;
    applyActiveSampleToMaterial(nodeMaterial, sample);
  });

  if (!visible || !atlasPayload?.texture) {
    return null;
  }

  return (
    <group ref={groupRef} position={position} scale={scale} visible={visible}>
      <group ref={billboardRef}>
        <mesh frustumCulled={false}>
          <planeGeometry args={geometryArgs} />
          {wireframe ? (
            <meshBasicMaterial
              color="#000000"
              wireframe
              side={THREE.DoubleSide}
              transparent
              opacity={0.95}
            />
          ) : (
            nodeMaterial && (
              <primitive object={nodeMaterial} attach="material" />
            )
          )}
        </mesh>
      </group>
    </group>
  );
}
