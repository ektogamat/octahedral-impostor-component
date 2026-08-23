import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import { MAX_TREES } from "../hooks/useRecordingTimeline";
import { buildRadialLayout } from "./utils/radialImpostorLayout";
import { sanitizeSourceMaterial } from "./CoconutTreeMesh";

function extractMeshParts(root) {
  const parts = [];
  if (!root) return parts;

  root.updateMatrixWorld(true);
  const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();

  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;

    const bakedMatrix = new THREE.Matrix4()
      .copy(child.matrixWorld)
      .premultiply(rootInverse);

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      if (!material) return;
      const prepared = sanitizeSourceMaterial(material.clone());
      parts.push({
        geometry: child.geometry,
        material: prepared,
        localMatrix: bakedMatrix,
        renderOrder: prepared.transparent ? 1 : 0,
      });
    });
  });

  return parts;
}

export default function InstancedTreeField({
  meshData,
  treeScale = 1,
  count = 1,
  scaleVariance = 0.15,
  maxCount = MAX_TREES,
}) {
  const meshRefs = useRef([]);
  const dummyRef = useRef(new THREE.Object3D());

  const parts = useMemo(
    () => extractMeshParts(meshData?.meshGroup),
    [meshData],
  );

  const fieldLayout = useMemo(() => {
    const worldWidth =
      Math.max(meshData?.size?.x ?? 1, meshData?.size?.z ?? 1) * treeScale;
    // Fixed disk so trees stay in frame and densify as count rises.
    const fieldRadius = worldWidth * 40;

    return { fieldRadius };
  }, [meshData, treeScale]);

  const positions = useMemo(
    () =>
      buildRadialLayout(count, {
        radius: fieldLayout.fieldRadius,
        y: 0,
        seed: 42,
        scaleVariance,
        fixedSpread: true,
      }),
    [count, fieldLayout.fieldRadius, scaleVariance],
  );

  useEffect(() => {
    meshRefs.current.forEach((mesh) => {
      if (!mesh) return;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
    });
  }, [parts.length]);

  useEffect(() => {
    const dummy = dummyRef.current;
    const treeCount = positions.length;

    parts.forEach((part, partIndex) => {
      const mesh = meshRefs.current[partIndex];
      if (!mesh) return;

      for (let i = 0; i < treeCount; i++) {
        const p = positions[i];
        const s = (p.scale ?? 1) * treeScale;

        dummy.position.set(p.x, p.y, p.z);
        dummy.scale.set(s, s, s);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        dummy.matrix.multiply(part.localMatrix);
        mesh.setMatrixAt(i, dummy.matrix);
      }

      mesh.count = treeCount;
      mesh.instanceMatrix.needsUpdate = true;
    });
  }, [parts, positions, treeScale]);

  if (!parts.length) return null;

  return (
    <>
      {parts.map((part, index) => (
        <instancedMesh
          key={`${part.geometry.uuid}-${part.material.uuid}`}
          ref={(node) => {
            meshRefs.current[index] = node;
          }}
          args={[part.geometry, part.material, maxCount]}
          matrixAutoUpdate={false}
          frustumCulled={false}
          renderOrder={part.renderOrder ?? 0}
        />
      ))}
    </>
  );
}
