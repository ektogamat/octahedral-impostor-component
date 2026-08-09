import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import { useGLTF } from "@react-three/drei";

export function useCoconutTreeMesh(modelPath = "/coconut_tree.glb") {
  const { scene } = useGLTF(modelPath);

  return useMemo(() => {
    const root = scene.clone(true);
    root.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });

    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Normalize so the tree sits on y=0 and is centered on XZ.
    root.position.x -= center.x;
    root.position.y -= box.min.y;
    root.position.z -= center.z;
    root.updateMatrixWorld(true);

    const normalizedBox = new THREE.Box3().setFromObject(root);
    const normalizedSize = new THREE.Vector3();
    const normalizedCenter = new THREE.Vector3();
    normalizedBox.getSize(normalizedSize);
    normalizedBox.getCenter(normalizedCenter);

    root.userData.__impostorSourceId = modelPath;

    return {
      meshGroup: root,
      bounds: normalizedBox.clone(),
      size: normalizedSize,
      center: normalizedCenter,
      height: normalizedSize.y,
    };
  }, [scene, modelPath]);
}

export function CoconutTreeModel({
  meshData,
  position = [0, 0, 0],
  scale = 1,
  wireframe = false,
}) {
  const groupRef = useRef(null);

  const displayGroup = useMemo(() => {
    if (!meshData?.meshGroup) return null;
    const clone = meshData.meshGroup.clone(true);
    clone.traverse((node) => {
      if (node.isMesh && node.material) {
        if (Array.isArray(node.material)) {
          node.material = node.material.map((material) => material.clone());
        } else {
          node.material = node.material.clone();
        }
      }
    });
    return clone;
  }, [meshData]);

  useEffect(() => {
    if (!displayGroup) return;
    displayGroup.traverse((node) => {
      if (!node.isMesh || !node.material) return;
      const materials = Array.isArray(node.material)
        ? node.material
        : [node.material];
      materials.forEach((material) => {
        material.wireframe = wireframe;
        material.needsUpdate = true;
      });
    });
  }, [displayGroup, wireframe]);

  if (!displayGroup) return null;

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <primitive object={displayGroup} />
    </group>
  );
}

useGLTF.preload("/coconut_tree.glb");
