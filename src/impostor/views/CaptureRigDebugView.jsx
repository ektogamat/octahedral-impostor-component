import { useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import { useFrame } from "@react-three/fiber";
import { useImpostorDemo } from "../impostorDemoStore";
import { CoconutTreeModel } from "../CoconutTreeMesh";

function ViewDirectionMarker({ target, length }) {
  const { activeSampleRef } = useImpostorDemo();
  const arrow = useMemo(
    () =>
      new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        target.clone(),
        length,
        0xffcc00,
        length * 0.12,
        length * 0.06,
      ),
    [target, length],
  );

  useFrame(() => {
    const sample = activeSampleRef?.current;
    if (!sample?.viewDirection) return;
    arrow.position.copy(target);
    arrow.setDirection(
      new THREE.Vector3(
        sample.viewDirection.x,
        sample.viewDirection.y,
        sample.viewDirection.z,
      ).normalize(),
    );
  });

  return <primitive object={arrow} />;
}

function CameraCone({ position, lookTarget, index, size }) {
  const meshRef = useRef(null);
  const materialRef = useRef(null);
  const { activeSampleRef } = useImpostorDemo();

  const quaternion = useMemo(() => {
    const toward = lookTarget.clone().sub(position).normalize();
    const quat = new THREE.Quaternion();
    if (toward.lengthSq() < 1e-8) return quat;
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), toward);
    return quat;
  }, [position, lookTarget]);

  useFrame(({ clock }) => {
    if (!meshRef.current || !materialRef.current) return;
    const sample = activeSampleRef?.current;
    const active = Boolean(sample?.indices?.includes(index));
    const pulse = active ? 1.2 + Math.sin(clock.elapsedTime * 5) * 0.12 : 1;
    meshRef.current.scale.setScalar(pulse * (active ? 1.35 : 0.9));
    materialRef.current.color.set(active ? "#ffcc00" : "#ffffff");
    materialRef.current.opacity = active ? 1 : 0.4;
    materialRef.current.wireframe = !active;
  });

  return (
    <group position={position} quaternion={quaternion}>
      <mesh ref={meshRef}>
        <coneGeometry args={[size * 0.35, size, 10]} />
        <meshBasicMaterial
          ref={materialRef}
          color="#ffffff"
          transparent
          opacity={0.4}
          wireframe
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function OctahedronWireframe({ octahedralData, center, radius }) {
  const geometry = useMemo(() => {
    if (!octahedralData?.pntOct) return null;

    const { pntOct } = octahedralData;
    const positions = new Float32Array(pntOct.length);
    for (let i = 0; i < pntOct.length; i += 3) {
      const dir = new THREE.Vector3(
        pntOct[i],
        pntOct[i + 1],
        pntOct[i + 2],
      ).normalize();
      positions[i] = center.x + dir.x * radius;
      positions[i + 1] = center.y + dir.y * radius;
      positions[i + 2] = center.z + dir.z * radius;
    }

    const geometry = octahedralData.geometry.clone();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [octahedralData, center, radius]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#88aaff" wireframe transparent opacity={0.35} />
    </mesh>
  );
}

export default function CaptureRigDebugView({ meshData, treeScale = 1 }) {
  const { octahedralData } = useImpostorDemo();
  const groupRef = useRef(null);

  const worldHeight = (meshData?.height ?? 1) * treeScale;
  const worldWidth =
    Math.max(meshData?.size?.x ?? 1, meshData?.size?.z ?? 1) * treeScale;
  const previewScale = treeScale;
  const lookTarget = useMemo(
    () => new THREE.Vector3(0, worldHeight * 0.5, 0),
    [worldHeight],
  );
  const radius = Math.max(worldHeight, worldWidth) * 0.95;
  const coneSize = radius * 0.08;

  const viewDirections = useMemo(() => {
    if (!octahedralData?.pntOct) return [];
    const dirs = [];
    const { pntOct } = octahedralData;
    for (let i = 0; i < pntOct.length; i += 3) {
      const dir = new THREE.Vector3(
        pntOct[i],
        pntOct[i + 1],
        pntOct[i + 2],
      ).normalize();
      dirs.push({
        index: i / 3,
        position: new THREE.Vector3(
          lookTarget.x + dir.x * radius,
          lookTarget.y + dir.y * radius,
          lookTarget.z + dir.z * radius,
        ),
      });
    }
    return dirs;
  }, [octahedralData, lookTarget, radius]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.15) * 0.2;
  });

  return (
    <group ref={groupRef}>
      {/* <OctahedronWireframe
        octahedralData={octahedralData}
        center={lookTarget}
        radius={radius}
      /> */}

      {viewDirections.map((dir) => (
        <CameraCone
          key={dir.index}
          index={dir.index}
          position={dir.position}
          lookTarget={lookTarget}
          size={coneSize}
        />
      ))}

      <CoconutTreeModel
        meshData={meshData}
        position={[0, 0, 0]}
        scale={previewScale}
        false
      />

      <ViewDirectionMarker target={lookTarget} length={radius * 0.85} />
    </group>
  );
}
