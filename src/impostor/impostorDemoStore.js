import { createContext, useContext } from "react";

export const DEMO_GRID_SIZES = [8, 16, 32];
export const DEMO_GRID_SIZE = DEMO_GRID_SIZES[0];
export const DEMO_ATLAS_SIZE = 4096;
export const DEMO_OCT_TYPE = 0;

export const impostorDemoDefaults = {
  showImpostors: false,
  showBillboards: false,
  wireframe: false,
  atlas: null,
  isGenerating: false,
  atlasError: null,
  octahedralData: null,
  samplingCache: null,
  meshGroup: null,
  modelTriangleCount: 0,
  impostorCount: 2,
  treeScale: 1,
  treeYOffset: 0,
  activeSampleRef: { current: null },
};

export const ImpostorDemoContext = createContext(impostorDemoDefaults);

export function useImpostorDemo() {
  return useContext(ImpostorDemoContext);
}

export function createEmptySample() {
  return {
    uv: { u: 0.5, v: 0.5 },
    col: 0,
    row: 0,
    localU: 0,
    localV: 0,
    indices: [0, 1, 2],
    weights: [1 / 3, 1 / 3, 1 / 3],
    isBackslash: false,
    viewDirection: { x: 0, y: 1, z: 0 },
  };
}
