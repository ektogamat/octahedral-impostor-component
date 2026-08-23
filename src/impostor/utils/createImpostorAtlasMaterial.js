import * as THREE from "three/webgpu";
import { texture, uniform, uv, vec2, vec3, float } from "three/tsl";

export function createImpostorAtlasMaterial(atlasPayload, gridSize, alphaTest = 0.28) {
  if (!atlasPayload?.texture) return null;

  const material = new THREE.MeshBasicNodeMaterial();
  // A2C + MSAA: soft edges without alphaHash grain; depthWrite stays on.
  material.transparent = false;
  material.alphaTest = alphaTest;
  material.alphaToCoverage = true;
  material.alphaHash = false;
  material.side = THREE.DoubleSide;
  material.depthWrite = true;
  material.depthTest = true;
  material.toneMapped = true;

  const stride = gridSize + 1;
  const strideUniform = uniform(float(stride));
  const atlasSize = atlasPayload.atlasSize ?? 4096;
  const slotSize = atlasPayload.slotSize ?? Math.floor(atlasSize / stride);
  const contentSize = atlasPayload.contentSize ?? slotSize;
  const cellPadding = atlasPayload.padding ?? 0;
  const slotSizeNorm = uniform(float(slotSize / atlasSize));
  const padNorm = uniform(float(cellPadding / atlasSize));
  const contentNorm = uniform(float(contentSize / atlasSize));
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

  const cellOriginA = cellIndexA.mul(slotSizeNorm);
  const cellOriginB = cellIndexB.mul(slotSizeNorm);
  const cellOriginC = cellIndexC.mul(slotSizeNorm);
  const padOffset = vec2(padNorm, padNorm);
  const atlasUVA = cellOriginA.add(padOffset).add(vUv.mul(contentNorm));
  const atlasUVB = cellOriginB.add(padOffset).add(vUv.mul(contentNorm));
  const atlasUVC = cellOriginC.add(padOffset).add(vUv.mul(contentNorm));

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
}

export function applyActiveSampleToMaterial(material, sample) {
  if (!material || !sample) return;
  material.userData.faceIndicesUniform.value.set(
    sample.indices[0],
    sample.indices[1],
    sample.indices[2],
  );
  material.userData.faceIndicesUniform.needsUpdate = true;
  material.userData.faceWeightsUniform.value.set(
    sample.weights[0],
    sample.weights[1],
    sample.weights[2],
  );
  material.userData.faceWeightsUniform.needsUpdate = true;
}
