import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useImpostorDemo } from "./impostorDemoStore";

/** Impostor card = unit plane = 2 triangles. */
const IMPOSTOR_TRIANGLES_PER_INSTANCE = 2;

function geometryTriangleCount(geometry) {
  if (!geometry) return 0;
  const index = geometry.index;
  if (index) return Math.floor(index.count / 3);
  const position = geometry.getAttribute("position");
  return position ? Math.floor(position.count / 3) : 0;
}

function countSceneStats(scene) {
  let triangles = 0;
  let drawCalls = 0;

  scene.traverseVisible((object) => {
    if (!object.isMesh || !object.geometry) return;

    const baseTris = geometryTriangleCount(object.geometry);

    if (object.isInstancedMesh) {
      const instanceCount = Math.max(0, object.count ?? 0);
      drawCalls += instanceCount > 0 ? 1 : 0;
      triangles += baseTris * instanceCount;
      return;
    }

    drawCalls += 1;
    triangles += baseTris;
  });

  return { triangles, drawCalls };
}

function formatCount(value) {
  return value.toLocaleString("en-US");
}

/**
 * Writes triangle / draw-call / savings counts into a DOM node.
 * modelTriangleCount comes from the loaded 3D model (per-model, not hardcoded).
 */
export default function MainViewStats({ statsElementRef }) {
  const { scene } = useThree();
  const lastUpdateRef = useRef(0);
  const {
    modelTriangleCount = 0,
    impostorCount = 0,
    showImpostors = false,
    showBillboards = false,
  } = useImpostorDemo();

  useFrame(({ clock }) => {
    const root = statsElementRef?.current;
    if (!root) return;
    if (clock.elapsedTime - lastUpdateRef.current < 0.2) return;
    lastUpdateRef.current = clock.elapsedTime;

    const { triangles, drawCalls } = countSceneStats(scene);
    const fieldActive = showImpostors || showBillboards;
    const count = Math.max(0, Math.floor(impostorCount));
    const modelTris = Math.max(0, modelTriangleCount);
    // Cost if every field tree were the full source mesh.
    const asMeshTriangles = count * modelTris;
    const impostorFieldTriangles = fieldActive
      ? count * IMPOSTOR_TRIANGLES_PER_INSTANCE
      : 0;
    const avoidedTriangles = fieldActive
      ? Math.max(0, asMeshTriangles - impostorFieldTriangles)
      : 0;

    const setStat = (key, value) => {
      const node = root.querySelector(`[data-stat="${key}"]`);
      if (node) node.textContent = formatCount(value);
    };

    setStat("triangles", triangles);
    setStat("drawcalls", drawCalls);
    setStat("model", modelTris);
    setStat("asmesh", asMeshTriangles);
    setStat("avoided", avoidedTriangles);
  });

  return null;
}
