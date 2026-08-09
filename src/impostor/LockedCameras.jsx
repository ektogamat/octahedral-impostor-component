import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * Orthographic camera locked to frame the atlas plane.
 * Re-applied every frame so other Views' OrbitControls cannot steal it.
 */
export function LockedAtlasCamera() {
  const cameraRef = useRef(null);
  const set = useThree((state) => state.set);

  useLayoutEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.position.set(0.5, 0.5, 5);
    camera.up.set(0, 1, 0);
    camera.lookAt(0.5, 0.5, 0);
    camera.zoom = 440;
    camera.updateProjectionMatrix();
    set({ camera });
  }, [set]);

  useFrame((state) => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.position.set(0.5, 0.5, 5);
    camera.quaternion.identity();
    camera.up.set(0, 1, 0);
    camera.lookAt(0.5, 0.5, 0);
    camera.updateMatrixWorld();
    if (state.camera !== camera) {
      state.set({ camera });
    }
  });

  return (
    <orthographicCamera
      ref={cameraRef}
      makeDefault
      position={[0.5, 0.5, 5]}
      zoom={440}
      near={0.1}
      far={20}
    />
  );
}

export function LockedRigCamera({ worldHeight, worldWidth }) {
  const cameraRef = useRef(null);
  const set = useThree((state) => state.set);
  const centerY = worldHeight * 0.5;
  const distance = Math.max(worldHeight, worldWidth) * 1.9;

  useLayoutEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.position.set(
      distance * 0.9,
      centerY + worldHeight * 0.35,
      distance * 0.9,
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(0, centerY, 0);
    camera.updateProjectionMatrix();
    set({ camera });
  }, [set, centerY, distance, worldHeight]);

  useFrame((state) => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.position.set(
      distance * 0.9,
      centerY + worldHeight * 0.35,
      distance * 0.9,
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(0, centerY, 0);
    camera.updateMatrixWorld();
    if (state.camera !== camera) {
      state.set({ camera });
    }
  });

  return (
    <perspectiveCamera
      ref={cameraRef}
      makeDefault
      position={[distance * 0.9, centerY + worldHeight * 0.35, distance * 0.9]}
      fov={50}
      near={0.05}
      far={100}
    />
  );
}
