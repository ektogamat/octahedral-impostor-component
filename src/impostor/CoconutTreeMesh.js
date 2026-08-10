import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import { useGLTF } from "@react-three/drei";

/** Triangle count for a loaded model root — used by stats / future model picker. */
export function countMeshTriangles(root) {
  if (!root) return 0;
  let triangles = 0;
  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const geometry = child.geometry;
    const index = geometry.index;
    if (index) {
      triangles += Math.floor(index.count / 3);
      return;
    }
    const position = geometry.getAttribute("position");
    if (position) triangles += Math.floor(position.count / 3);
  });
  return triangles;
}

/**
 * GLTF often marks opaque paints as alpha-blend (transparent + depthWrite false),
 * which makes surfaces see-through depending on draw order.
 */
export function sanitizeSourceMaterial(material) {
  if (!material) return material;
  material.side = THREE.DoubleSide;

  const hasCutout =
    material.alphaTest > 0 || Boolean(material.alphaMap) || Boolean(material.alphaHash);
  const fullyOpaque = (material.opacity ?? 1) >= 0.999 && !hasCutout;

  if (fullyOpaque) {
    material.transparent = false;
    material.depthWrite = true;
    material.depthTest = true;
    material.opacity = 1;
  } else {
    material.depthWrite = true;
  }

  material.needsUpdate = true;
  return material;
}

function sanitizeMeshMaterials(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;
    const materials = Array.isArray(child.material)
      ? child.material
      : child.material
        ? [child.material]
        : [];
    materials.forEach((material) => sanitizeSourceMaterial(material));
  });
}

export function useImpostorSourceMesh(modelPath = "/coconut_tree.glb") {
  const { scene } = useGLTF(modelPath);

  return useMemo(() => {
    const root = scene.clone(true);
    sanitizeMeshMaterials(root);

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
    const triangleCount = countMeshTriangles(root);

    return {
      meshGroup: root,
      bounds: normalizedBox.clone(),
      size: normalizedSize,
      center: normalizedCenter,
      height: normalizedSize.y,
      triangleCount,
      modelId: modelPath,
    };
  }, [scene, modelPath]);
}

/** @deprecated Prefer useImpostorSourceMesh — kept for existing imports. */
export const useCoconutTreeMesh = useImpostorSourceMesh;

export function ImpostorSourceModel({
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
      if (!node.isMesh || !node.material) return;
      if (Array.isArray(node.material)) {
        node.material = node.material.map((material) =>
          sanitizeSourceMaterial(material.clone()),
        );
      } else {
        node.material = sanitizeSourceMaterial(node.material.clone());
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
        if (wireframe) {
          if (material.userData.__impostorBaseColor === undefined) {
            material.userData.__impostorBaseColor = material.color.getHex();
          }
          material.color.setHex(0xffffff);
        } else if (material.userData.__impostorBaseColor !== undefined) {
          material.color.setHex(material.userData.__impostorBaseColor);
        }
        material.wireframe = wireframe;
        sanitizeSourceMaterial(material);
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

/** @deprecated Prefer ImpostorSourceModel */
export const CoconutTreeModel = ImpostorSourceModel;

useGLTF.preload("/coconut_tree.glb");
useGLTF.preload("/low_poly_fox.glb");
