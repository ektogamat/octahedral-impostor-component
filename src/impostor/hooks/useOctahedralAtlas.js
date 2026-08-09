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

  return `${mesh.userData.__impostorSourceId}|g${gridSize}|a${atlasSize}|o${octType}|v10`;
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
      .then((texture) => {
        const atlasPayload = {
          texture,
          gridSize,
          octType,
          octahedralData,
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
 * - Pack stride x stride tiles where stride = gridSize + 1 (one tile per
 *   octahedron vertex). flatIdx = row * stride + col must match the vertex
 *   order from octahedralHelper and the shader decode.
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

  // Collapse hierarchy into centered local geometry so every view orbits the same pivot.
  renderMesh.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    node.updateMatrixWorld(true);
    node.geometry.applyMatrix4(node.matrixWorld);
    node.geometry.translate(-center.x, -center.y, -center.z);
    node.position.set(0, 0, 0);
    node.rotation.set(0, 0, 0);
    node.scale.set(1, 1, 1);
    node.updateMatrix();
  });
  renderMesh.position.set(0, 0, 0);
  renderMesh.rotation.set(0, 0, 0);
  renderMesh.scale.set(1, 1, 1);

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const scaleFactor = 0.72 / maxDim;
  renderMesh.scale.setScalar(scaleFactor);
  renderMesh.updateMatrixWorld(true);

  const orthoSize = 0.5;
  const stride = gridSize + 1;
  const cellSize = Math.floor(atlasSize / stride);
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
  tempCanvas.width = cellSize;
  tempCanvas.height = cellSize;

  const tempGlRenderer = new THREEGL.WebGLRenderer({
    canvas: tempCanvas,
    preserveDrawingBuffer: true,
    antialias: false,
  });
  tempGlRenderer.setSize(cellSize, cellSize);
  tempGlRenderer.setClearColor(0x000000, 0);

  const glRenderScene = new THREEGL.Scene();
  glRenderScene.add(new THREEGL.AmbientLight(0xffffff, 0.2));

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
    const bakedMaterials = sourceMaterials.map((material) => {
      return new THREEGL.MeshBasicMaterial({
        color: material.color?.clone?.() ?? new THREEGL.Color(0xffffff),
        map: material.map ?? null,
        alphaMap: material.alphaMap ?? null,
        transparent: true,
        alphaTest: 0.05,
        side: THREEGL.DoubleSide,
        depthWrite: true,
      });
    });
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

        const pixels = new Uint8Array(cellSize * cellSize * 4);
        glContext.readPixels(
          0,
          0,
          cellSize,
          cellSize,
          glContext.RGBA,
          glContext.UNSIGNED_BYTE,
          pixels,
        );

        const cellImageData = ctx.createImageData(cellSize, cellSize);
        cellImageData.data.set(pixels);
        ctx.putImageData(cellImageData, colIdx * cellSize, rowIdx * cellSize);
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
  atlasTexture.minFilter = THREE.LinearFilter;
  atlasTexture.magFilter = THREE.LinearFilter;
  atlasTexture.wrapS = THREE.ClampToEdgeWrapping;
  atlasTexture.wrapT = THREE.ClampToEdgeWrapping;

  return atlasTexture;
}
