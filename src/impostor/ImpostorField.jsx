import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import { useFrame, useThree } from "@react-three/fiber";
import { useImpostorDemo, DEMO_GRID_SIZE } from "./impostorDemoStore";
import { buildRadialLayout } from "./utils/radialImpostorLayout";
import {
  applyActiveSampleToMaterial,
  createImpostorAtlasMaterial,
} from "./utils/createImpostorAtlasMaterial";

function orientBillboard(mesh, camera, faceCenter) {
  const origin = faceCenter ?? mesh.position;
  const dx = camera.position.x - origin.x;
  const dy = camera.position.y - origin.y;
  const dz = camera.position.z - origin.z;
  const yaw = Math.atan2(dx, dz);
  const pitch = Math.atan2(dy, Math.hypot(dx, dz));
  mesh.rotation.order = "YXZ";
  mesh.rotation.set(-pitch, yaw, 0);
}

export default function ImpostorField({
  count = 2,
  planeSize = 2,
  centerY = 0,
  radius,
  faceCenter = null,
  scaleVariance = 0,
  showImpostors = false,
  wireframe = false,
  alphaTest = 0.3,
}) {
  const groupRef = useRef(null);
  const meshesRef = useRef([]);
  const { camera } = useThree();
  const { atlas, activeSampleRef } = useImpostorDemo();

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
        color: 0x000000,
        wireframe: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      }),
    [],
  );

  const planeGeometry = useMemo(
    () => new THREE.PlaneGeometry(planeSize, planeSize),
    [planeSize],
  );

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    meshesRef.current.forEach((mesh) => {
      group.remove(mesh);
    });
    meshesRef.current = [];

    if (!showImpostors || !atlas?.texture) return;

    const material = wireframe ? wireframeMaterial : atlasMaterial;
    if (!material) return;

    for (let i = 0; i < positions.length; i++) {
      const mesh = new THREE.Mesh(planeGeometry, material);
      mesh.frustumCulled = false;
      mesh.position.set(positions[i].x, positions[i].y, positions[i].z);
      const s = positions[i].scale ?? 1;
      mesh.scale.setScalar(s);
      group.add(mesh);
      meshesRef.current.push(mesh);
    }

    return () => {
      meshesRef.current.forEach((mesh) => {
        group.remove(mesh);
      });
      meshesRef.current = [];
    };
  }, [
    positions,
    showImpostors,
    atlas,
    planeGeometry,
    atlasMaterial,
    wireframeMaterial,
    wireframe,
  ]);

  useEffect(() => {
    return () => {
      atlasMaterial?.dispose();
      wireframeMaterial?.dispose();
      planeGeometry?.dispose();
    };
  }, [atlasMaterial, wireframeMaterial, planeGeometry]);

  useFrame(() => {
    const meshes = meshesRef.current;
    if (!meshes.length) return;

    for (const mesh of meshes) {
      orientBillboard(mesh, camera, billboardOrigin);
    }

    if (wireframe || !atlasMaterial) return;

    const sample = activeSampleRef?.current;
    if (!sample) return;
    applyActiveSampleToMaterial(atlasMaterial, sample);
  });

  if (!showImpostors || !atlas?.texture) {
    return null;
  }

  return <group ref={groupRef} />;
}
