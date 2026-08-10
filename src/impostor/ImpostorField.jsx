import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import { useFrame, useThree } from "@react-three/fiber";
import { useImpostorDemo, DEMO_GRID_SIZE } from "./impostorDemoStore";
import { buildRadialLayout } from "./utils/radialImpostorLayout";
import { sampleOctahedralDirection } from "./utils/octahedralImpostorMath";
import {
  applyActiveSampleToMaterial,
  createImpostorAtlasMaterial,
} from "./utils/createImpostorAtlasMaterial";

/** Fixed horizon view → single atlas cell (classic static billboard). */
function createFixedBillboardSample(samplingCache) {
  if (!samplingCache) return null;

  const indicesTarget = new THREE.Vector3();
  const weightsTarget = new THREE.Vector3();
  const direction = new THREE.Vector3(0, 0.18, 1).normalize();
  const result = sampleOctahedralDirection({
    direction,
    cache: samplingCache,
    indicesTarget,
    weightsTarget,
  });
  if (!result) return null;

  let best = 0;
  if (result.weights[1] > result.weights[best]) best = 1;
  if (result.weights[2] > result.weights[best]) best = 2;
  const index = result.indices[best];

  return {
    ...result,
    indices: [index, index, index],
    weights: [1, 0, 0],
  };
}

export default function ImpostorField({
  count = 2,
  planeSize = 2,
  centerY = 0,
  radius,
  faceCenter = null,
  scaleVariance = 0,
  mode = "off",
  wireframe = false,
  alphaTest = 0.3,
}) {
  const meshRef = useRef(null);
  const dummyRef = useRef(new THREE.Object3D());
  const fixedSampleRef = useRef(null);
  const { camera } = useThree();
  const { atlas, activeSampleRef, samplingCache } = useImpostorDemo();

  const active = mode === "impostor" || mode === "billboard";
  const gridSize = atlas?.gridSize ?? DEMO_GRID_SIZE;
  const layoutRadius = radius ?? planeSize * 0.85;
  const billboardOrigin = useMemo(() => {
    if (faceCenter) {
      return faceCenter instanceof THREE.Vector3
        ? faceCenter
        : new THREE.Vector3(faceCenter.x, faceCenter.y, faceCenter.z);
    }
    return new THREE.Vector3(0, centerY, 0);
  }, [faceCenter, centerY]);

  const positions = useMemo(
    () =>
      buildRadialLayout(count, {
        radius: layoutRadius,
        y: centerY,
        seed: 42,
        scaleVariance,
      }),
    [count, layoutRadius, centerY, scaleVariance],
  );

  const atlasMaterial = useMemo(
    () => createImpostorAtlasMaterial(atlas, gridSize, alphaTest),
    [atlas, gridSize, alphaTest],
  );

  const wireframeMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      }),
    [],
  );

  const planeGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  useEffect(() => {
    if (mode !== "billboard" || !samplingCache || !atlasMaterial) {
      fixedSampleRef.current = null;
      return;
    }
    const sample = createFixedBillboardSample(samplingCache);
    fixedSampleRef.current = sample;
    if (sample) applyActiveSampleToMaterial(atlasMaterial, sample);
  }, [mode, samplingCache, atlasMaterial]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
  }, [positions.length, wireframe, atlasMaterial, mode]);

  useEffect(() => {
    return () => {
      atlasMaterial?.dispose();
      wireframeMaterial?.dispose();
      planeGeometry?.dispose();
    };
  }, [atlasMaterial, wireframeMaterial, planeGeometry]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || !positions.length || !active) return;

    const dummy = dummyRef.current;
    const origin = billboardOrigin;
    const dx = camera.position.x - origin.x;
    const dy = camera.position.y - origin.y;
    const dz = camera.position.z - origin.z;
    const yaw = Math.atan2(dx, dz);
    const pitch = Math.atan2(dy, Math.hypot(dx, dz));

    // Full camera-facing billboard (pitch included) — from above, cards lie flat.
    dummy.rotation.order = "YXZ";
    dummy.rotation.set(-pitch, yaw, 0);

    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      const s = (p.scale ?? 1) * planeSize;
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(s, s, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = positions.length;

    if (wireframe || !atlasMaterial) return;

    if (mode === "billboard") {
      const fixed = fixedSampleRef.current;
      if (fixed) applyActiveSampleToMaterial(atlasMaterial, fixed);
      return;
    }

    const sample = activeSampleRef?.current;
    if (!sample) return;
    applyActiveSampleToMaterial(atlasMaterial, sample);
  });

  if (!active || !atlas?.texture || !positions.length) {
    return null;
  }

  const material = wireframe ? wireframeMaterial : atlasMaterial;
  if (!material) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[planeGeometry, material, positions.length]}
      key={`${material.uuid}-${positions.length}-${mode}-${wireframe ? "w" : "a"}`}
      matrixAutoUpdate={false}
      frustumCulled={false}
    />
  );
}
