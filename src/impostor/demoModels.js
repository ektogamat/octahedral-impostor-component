export const DEMO_MODELS = [
  {
    id: "tree-low-poly",
    label: "1 · Low poly tree",
    path: "/tree_low-poly.glb",
  },
  {
    id: "coconut-tree",
    label: "2 · Coconut tree",
    path: "/coconut_tree.glb",
  },
  {
    id: "low-poly-fox",
    label: "3 · Low poly fox",
    path: "/low_poly_fox.glb",
  },
];

export const DEFAULT_DEMO_MODEL_ID = DEMO_MODELS[0].id;

export function getDemoModelById(id) {
  return DEMO_MODELS.find((model) => model.id === id) ?? DEMO_MODELS[0];
}
