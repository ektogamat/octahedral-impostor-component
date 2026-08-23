import { useEffect, useMemo, useState } from "react";
import * as THREE from "three/webgpu";
import * as THREEGL from "three";
import { useThree } from "@react-three/fiber";
import { buildOctahedralMesh, OCT_TYPE } from "../utils/octahedralHelper";

const atlasCache = new Map();
const pendingAtlasPromises = new Map();

function buildAtlasCacheKey(mesh, gridSize, atlasSize, octType) {
  if (!mesh) return null;

  if (!mesh.userData.__impostorSourceId) {
    mesh.userData.__impostorSourceId =
      mesh.name && mesh.name.length > 0
        ? mesh.name
        : THREE.MathUtils.generateUUID();
  }

  return `${mesh.userData.__impostorSourceId}|g${gridSize}|a${atlasSize}|o${octType}|v20`;
}

/** Gutter pixels between atlas cells — extruded from content edges for safe mip filtering. */
export const ATLAS_CELL_PADDING = 4;

export function computeAtlasLayout(atlasSize, gridSize) {
  const stride = gridSize + 1;
  const slotSize = Math.floor(atlasSize / stride);
  const padding = Math.min(
    ATLAS_CELL_PADDING,
    Math.max(0, Math.floor((slotSize - 8) / 2)),
  );
  const contentSize = slotSize - padding * 2;

  return {
    stride,
    slotSize,
    contentSize,
    padding,
    atlasSize,
  };
}

/** PBR/lit sources need lights in the bake; unlit Basic (tree) must stay albedo-only. */
function sourceNeedsLitBake(mesh) {
  let needsLit = false;
  mesh.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const materials = Array.isArray(node.material)
      ? node.material
      : [node.material];
    for (const material of materials) {
      if (
        material.isMeshStandardMaterial ||
        material.isMeshPhysicalMaterial ||
        material.isMeshLambertMaterial ||
        material.isMeshPhongMaterial
      ) {
        needsLit = true;
        break;
      }
    }
  });
  return needsLit;
}

function createBakeMaterial(material, litBake) {
  // Foliage glTFs often use BLEND (transparent + map alpha, alphaTest=0).
  // Bake must cut those texels out so empty pixels keep clearColor alpha=0.
  // Do NOT assign alphaMap = map — that multiplies alpha twice.
  const usesTextureAlpha =
    (material.alphaTest ?? 0) > 0 ||
    Boolean(material.alphaMap) ||
    Boolean(material.alphaToCoverage) ||
    Boolean(material.alphaHash) ||
    (Boolean(material.transparent) && Boolean(material.map)) ||
    /leaf|leav|foliage|billboard/i.test(material.name ?? "");

  const shared = {
    color: material.color?.clone?.() ?? new THREEGL.Color(0xffffff),
    map: material.map ?? null,
    alphaMap: material.alphaMap ?? null,
    transparent: usesTextureAlpha,
    alphaTest: usesTextureAlpha
      ? Math.max(material.alphaTest ?? 0, 0.28)
      : 0,
    side: THREEGL.DoubleSide,
    depthWrite: true,
    toneMapped: false,
  };

  if (!litBake) {
    return new THREEGL.MeshBasicMaterial(shared);
  }

  return new THREEGL.MeshStandardMaterial({
    ...shared,
    metalness: material.metalness ?? 0,
    roughness: material.roughness ?? 0.8,
    normalMap: material.normalMap ?? null,
    aoMap: material.aoMap ?? null,
    emissive: material.emissive?.clone?.() ?? new THREEGL.Color(0x000000),
    emissiveMap: material.emissiveMap ?? null,
    emissiveIntensity: material.emissiveIntensity ?? 1,
  });
}

/**
 * Spread opaque RGB into neighboring transparent texels so atlas filtering
 * does not bleed clear-color into leaf edges (classic impostor bake trick).
 */
function dilateCellRgbIntoAlpha(pixels, width, height, radius = 1) {
  const src = pixels.slice();
  const opaque = 8;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (src[i + 3] >= opaque) continue;

      let bestDist = Infinity;
      let br = 0;
      let bg = 0;
      let bb = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = (ny * width + nx) * 4;
          if (src[ni + 3] < opaque) continue;
          const dist = dx * dx + dy * dy;
          if (dist >= bestDist) continue;
          bestDist = dist;
          br = src[ni];
          bg = src[ni + 1];
          bb = src[ni + 2];
        }
      }

      if (bestDist === Infinity) continue;
      pixels[i] = br;
      pixels[i + 1] = bg;
      pixels[i + 2] = bb;
    }
  }
}

/** Place content in a padded slot and replicate edge texels into the gutter. */
function buildPaddedCell(contentPixels, contentSize, padding) {
  const slotSize = contentSize + padding * 2;
  const slot = new Uint8Array(slotSize * slotSize * 4);

  for (let y = 0; y < contentSize; y++) {
    for (let x = 0; x < contentSize; x++) {
      const si = ((y + padding) * slotSize + (x + padding)) * 4;
      const ci = (y * contentSize + x) * 4;
      slot[si] = contentPixels[ci];
      slot[si + 1] = contentPixels[ci + 1];
      slot[si + 2] = contentPixels[ci + 2];
      slot[si + 3] = contentPixels[ci + 3];
    }
  }

  for (let y = 0; y < slotSize; y++) {
    for (let x = 0; x < slotSize; x++) {
      if (
        x >= padding &&
        x < padding + contentSize &&
        y >= padding &&
        y < padding + contentSize
      ) {
        continue;
      }

      const cx = Math.min(Math.max(x, padding), padding + contentSize - 1);
      const cy = Math.min(Math.max(y, padding), padding + contentSize - 1);
      const si = (y * slotSize + x) * 4;
      const ci = (cy * slotSize + cx) * 4;
      slot[si] = slot[ci];
      slot[si + 1] = slot[ci + 1];
      slot[si + 2] = slot[ci + 2];
      slot[si + 3] = slot[ci + 3];
    }
  }

  return slot;
}

export function useOctahedralAtlas({
  mesh = null,
  gridSize = 16,
  atlasSize = 2048,
  octType = OCT_TYPE.HEMI,
  enabled = true,
}) {
  const { gl } = useThree();
  const [atlas, setAtlas] = useState(null);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const octahedralData = useMemo(() => {
    if (!enabled) return null;
    try {
      return buildOctahedralMesh(octType, gridSize);
    } catch (err) {
      console.error("Failed to build octahedral mesh:", err);
      return null;
    }
  }, [octType, gridSize, enabled]);

  useEffect(() => {
    if (!enabled || !mesh || !octahedralData || !gl) {
      setAtlas(null);
      return;
    }

    const cacheKey = buildAtlasCacheKey(mesh, gridSize, atlasSize, octType);

    if (cacheKey && atlasCache.has(cacheKey)) {
      setAtlas(atlasCache.get(cacheKey));
      setIsGenerating(false);
      setError(null);
      return;
    }

    if (cacheKey && pendingAtlasPromises.has(cacheKey)) {
      setIsGenerating(true);
      setError(null);
      pendingAtlasPromises
        .get(cacheKey)
        .then((cachedAtlas) => {
          setAtlas(cachedAtlas);
          setIsGenerating(false);
        })
        .catch((err) => {
          console.error("Failed to generate atlas:", err);
          setError(err);
          setIsGenerating(false);
        });
      return;
    }

    setIsGenerating(true);
    setError(null);

    const atlasPromise = generateAtlas({
      mesh,
      octahedralData,
      gridSize,
      atlasSize,
    })
      .then(({ texture, litBake, layout }) => {
        const atlasPayload = {
          texture,
          litBake,
          gridSize,
          octType,
          octahedralData,
          atlasSize: layout.atlasSize,
          slotSize: layout.slotSize,
          contentSize: layout.contentSize,
          padding: layout.padding,
        };

        if (cacheKey) {
          atlasCache.set(cacheKey, atlasPayload);
        }

        setAtlas(atlasPayload);
        setIsGenerating(false);
        return atlasPayload;
      })
      .catch((err) => {
        console.error("Failed to generate atlas:", err);
        setError(err);
        setIsGenerating(false);
        throw err;
      });

    if (cacheKey) {
      pendingAtlasPromises.set(cacheKey, atlasPromise);
    }

    atlasPromise.finally(() => {
      if (cacheKey) {
        pendingAtlasPromises.delete(cacheKey);
      }
    });
  }, [mesh, octahedralData, gridSize, atlasSize, enabled, gl, octType]);

  return {
    atlas,
    error,
    isGenerating,
    octahedralData,
  };
}

/**
 * Bake framing:
 * - Bake all mesh geometry into a single local space centered on the AABB
 * - Scale so the largest axis fits inside the ortho frame (±0.5) with margin
 * - Always lookAt(0,0,0) so every view shares the same pivot (stable base)
 * - Pack stride x stride slots with ATLAS_CELL_PADDING gutter between cells.
 *   Each slot holds contentSize x contentSize texels plus extruded edge padding
 *   so mipmaps do not bleed between adjacent views.
 */
async function generateAtlas({ mesh, octahedralData, gridSize, atlasSize }) {
  const renderMesh =
    mesh instanceof THREE.Group
      ? mesh.clone(true)
      : (() => {
          const group = new THREE.Group();
          group.add(mesh.clone(true));
          return group;
        })();
  renderMesh.visible = true;

  // Clone geometries before mutating — Object3D.clone shares geometry refs.
  renderMesh.traverse((node) => {
    if (node.isMesh && node.geometry) {
      node.geometry = node.geometry.clone();
    }
  });

  renderMesh.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(renderMesh);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());

  // Bake world matrices into geometry, then clear EVERY node transform.
  // Sketchfab kits (e.g. fox) keep tiny scales on parents — zeroing only the
  // mesh leaves those parents applied twice and the subject vanishes from the
  // ortho frustum (empty atlas).
  renderMesh.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    node.updateMatrixWorld(true);
    node.geometry.applyMatrix4(node.matrixWorld);
    node.geometry.translate(-center.x, -center.y, -center.z);
  });
  renderMesh.traverse((node) => {
    node.position.set(0, 0, 0);
    node.rotation.set(0, 0, 0);
    node.quaternion.identity();
    node.scale.set(1, 1, 1);
    node.updateMatrix();
  });

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const scaleFactor = 0.72 / maxDim;
  renderMesh.scale.setScalar(scaleFactor);
  renderMesh.updateMatrixWorld(true);

  const orthoSize = 0.5;
  const layout = computeAtlasLayout(atlasSize, gridSize);
  const { stride, slotSize, contentSize, padding } = layout;
  const { pntOct } = octahedralData;

  const canvas = document.createElement("canvas");
  canvas.width = atlasSize;
  canvas.height = atlasSize;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Failed to create 2D canvas context for atlas generation");
  }
  ctx.clearRect(0, 0, atlasSize, atlasSize);

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = contentSize;
  tempCanvas.height = contentSize;

  const tempGlRenderer = new THREEGL.WebGLRenderer({
    canvas: tempCanvas,
    preserveDrawingBuffer: true,
    antialias: false,
  });
  tempGlRenderer.setSize(contentSize, contentSize);
  tempGlRenderer.setClearColor(0x000000, 0);
  // No ACES in the bake — runtime tone-maps impostors once (matches main view).
  tempGlRenderer.outputColorSpace = THREEGL.SRGBColorSpace;
  tempGlRenderer.toneMapping = THREEGL.NoToneMapping;

  const litBake = sourceNeedsLitBake(renderMesh);
  const glRenderScene = new THREEGL.Scene();

  if (litBake) {
    // Match ImpostorDemoScene main view: ambient 2.55 + key [5,8,4] @ 1.4.
    // Environment HDRI (studio_small_09, intensity 0.55) is approximated by fill.
    glRenderScene.add(new THREEGL.AmbientLight(0xffffff, 5.55));
    const key = new THREEGL.DirectionalLight(0xffffff, 1.4);
    key.position.set(5, 8, 4);
    glRenderScene.add(key);
    const fill = new THREEGL.DirectionalLight(0xffffff, 0.55);
    fill.position.set(-4, 3, -2);
    glRenderScene.add(fill);
  }

  const glRenderCam = new THREEGL.OrthographicCamera(
    -orthoSize,
    orthoSize,
    orthoSize,
    -orthoSize,
    0.001,
    10,
  );

  const glRenderMesh = renderMesh.clone(true);
  glRenderMesh.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const sourceMaterials = Array.isArray(node.material)
      ? node.material
      : [node.material];
    const bakedMaterials = sourceMaterials.map((material) =>
      createBakeMaterial(material, litBake),
    );
    node.material =
      bakedMaterials.length === 1 ? bakedMaterials[0] : bakedMaterials;
  });
  glRenderScene.add(glRenderMesh);

  for (let rowIdx = 0; rowIdx < stride; rowIdx++) {
    for (let colIdx = 0; colIdx < stride; colIdx++) {
      const flatIdx = rowIdx * stride + colIdx;
      if (flatIdx * 3 + 2 >= pntOct.length) continue;

      const viewDir = new THREEGL.Vector3(
        pntOct[flatIdx * 3],
        pntOct[flatIdx * 3 + 1],
        pntOct[flatIdx * 3 + 2],
      ).normalize();

      glRenderCam.position.copy(viewDir).multiplyScalar(1.1);
      // Same YXZ basis as runtime OctahedralImpostor (roll=0, no lookAt pole flip).
      const yaw = Math.atan2(viewDir.x, viewDir.z);
      const pitch = Math.atan2(
        viewDir.y,
        Math.hypot(viewDir.x, viewDir.z),
      );
      glRenderCam.rotation.order = "YXZ";
      glRenderCam.rotation.set(-pitch, yaw, 0);
      glRenderCam.updateMatrixWorld(true);

      try {
        tempGlRenderer.clear();
        tempGlRenderer.render(glRenderScene, glRenderCam);

        const glContext = tempGlRenderer.getContext();
        if (!glContext) continue;

        const pixels = new Uint8Array(contentSize * contentSize * 4);
        glContext.readPixels(
          0,
          0,
          contentSize,
          contentSize,
          glContext.RGBA,
          glContext.UNSIGNED_BYTE,
          pixels,
        );

        dilateCellRgbIntoAlpha(pixels, contentSize, contentSize, 2);

        const slotPixels = buildPaddedCell(pixels, contentSize, padding);
        const cellImageData = ctx.createImageData(slotSize, slotSize);
        cellImageData.data.set(slotPixels);
        ctx.putImageData(cellImageData, colIdx * slotSize, rowIdx * slotSize);
      } catch (err) {
        console.warn("Error reading pixels from render target:", err);
      }
    }
  }

  tempGlRenderer.dispose();
  glRenderMesh.traverse((node) => {
    if (!node.isMesh) return;
    node.geometry?.dispose();
    if (Array.isArray(node.material)) {
      node.material.forEach((material) => material.dispose());
    } else {
      node.material?.dispose();
    }
  });

  const atlasTexture = new THREE.CanvasTexture(canvas);
  atlasTexture.needsUpdate = true;
  atlasTexture.flipY = false;
  atlasTexture.colorSpace = THREE.SRGBColorSpace;
  atlasTexture.generateMipmaps = true;
  atlasTexture.minFilter = THREE.LinearMipmapLinearFilter;
  atlasTexture.magFilter = THREE.LinearFilter;
  atlasTexture.wrapS = THREE.ClampToEdgeWrapping;
  atlasTexture.wrapT = THREE.ClampToEdgeWrapping;

  return { texture: atlasTexture, litBake, layout };
}
