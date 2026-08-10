import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

function countSceneStats(scene) {
  let triangles = 0;
  let drawCalls = 0;

  scene.traverseVisible((object) => {
    if (!object.isMesh || !object.geometry) return;
    drawCalls += 1;

    const geometry = object.geometry;
    const index = geometry.index;
    if (index) {
      triangles += Math.floor(index.count / 3);
      return;
    }

    const position = geometry.getAttribute("position");
    if (position) {
      triangles += Math.floor(position.count / 3);
    }
  });

  return { triangles, drawCalls };
}

function formatCount(value) {
  return value.toLocaleString("en-US");
}

/**
 * Writes triangle / draw-call counts for the main View scene into a DOM node.
 */
export default function MainViewStats({ statsElementRef }) {
  const { scene } = useThree();
  const lastUpdateRef = useRef(0);

  useFrame(({ clock }) => {
    const root = statsElementRef?.current;
    if (!root) return;
    if (clock.elapsedTime - lastUpdateRef.current < 0.2) return;
    lastUpdateRef.current = clock.elapsedTime;

    const { triangles, drawCalls } = countSceneStats(scene);
    const trianglesNode = root.querySelector('[data-stat="triangles"]');
    const drawCallsNode = root.querySelector('[data-stat="drawcalls"]');
    if (trianglesNode) trianglesNode.textContent = formatCount(triangles);
    if (drawCallsNode) drawCallsNode.textContent = formatCount(drawCalls);
  });

  return null;
}
