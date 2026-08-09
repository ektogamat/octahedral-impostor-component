import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three/webgpu";
import { useFrame, useThree } from "@react-three/fiber";
import { texture, uniform, uv, vec2, vec3, float } from "three/tsl";

export default function OctahedralImpostor({
  atlasPayload = null,
  activeSampleRef = null,
  // When set, face the camera using this subject center (same as atlas sampling)
  // instead of the card's own position — required for offset comparison impostors.
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

  const nodeMaterial = useMemo(() => {
    if (!atlasPayload?.texture) return null;

    const material = new THREE.MeshBasicNodeMaterial();
    material.transparent = true;
    material.alphaTest = alphaTest;
    material.side = THREE.DoubleSide;
    material.depthWrite = false;

    // Vertex indices use stride = gridSize + 1 (see octahedralHelper createGrid).
    // Bake packs one tile per vertex the same way: flatIndex = row * stride + col.
    const stride = gridSize + 1;
    const strideUniform = uniform(float(stride));
    const atlasTexture = texture(atlasPayload.texture);
    const faceIndicesUniform = uniform(vec3(0, 1, 2));
    const faceWeightsUniform = uniform(vec3(1.0 / 3.0, 1.0 / 3.0, 1.0 / 3.0));
    const vUv = uv();

    const flatIndexA = float(faceIndicesUniform.x);
    const flatIndexB = float(faceIndicesUniform.y);
    const flatIndexC = float(faceIndicesUniform.z);

    const rowA = flatIndexA.div(strideUniform).floor();
    const colA = flatIndexA.sub(rowA.mul(strideUniform));
    const cellIndexA = vec2(colA, rowA);

    const rowB = flatIndexB.div(strideUniform).floor();
    const colB = flatIndexB.sub(rowB.mul(strideUniform));
    const cellIndexB = vec2(colB, rowB);

    const rowC = flatIndexC.div(strideUniform).floor();
    const colC = flatIndexC.sub(rowC.mul(strideUniform));
    const cellIndexC = vec2(colC, rowC);

    const invStride = float(1.0).div(strideUniform);
    const atlasUVA = cellIndexA.add(vUv).mul(invStride);
    const atlasUVB = cellIndexB.add(vUv).mul(invStride);
    const atlasUVC = cellIndexC.add(vUv).mul(invStride);

    const colorA = atlasTexture.sample(atlasUVA);
    const colorB = atlasTexture.sample(atlasUVB);
    const colorC = atlasTexture.sample(atlasUVC);

    material.colorNode = colorA.rgb
      .mul(faceWeightsUniform.x)
      .add(colorB.rgb.mul(faceWeightsUniform.y))
      .add(colorC.rgb.mul(faceWeightsUniform.z));

    material.opacityNode = colorA.a
      .mul(faceWeightsUniform.x)
      .add(colorB.a.mul(faceWeightsUniform.y))
      .add(colorC.a.mul(faceWeightsUniform.z));

    material.userData.faceIndicesUniform = faceIndicesUniform;
    material.userData.faceWeightsUniform = faceWeightsUniform;

    return material;
  }, [atlasPayload, gridSize, alphaTest]);

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

    nodeMaterial.userData.faceIndicesUniform.value.set(
      sample.indices[0],
      sample.indices[1],
      sample.indices[2],
    );
    nodeMaterial.userData.faceIndicesUniform.needsUpdate = true;

    nodeMaterial.userData.faceWeightsUniform.value.set(
      sample.weights[0],
      sample.weights[1],
      sample.weights[2],
    );
    nodeMaterial.userData.faceWeightsUniform.needsUpdate = true;
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
              color="#ffcc00"
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
