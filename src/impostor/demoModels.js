export const DEMO_MODELS = [
  {
    id: "coconut-tree",
    label: "1 · Coconut tree",
    path: "/coconut_tree.glb",
  },
  {
    id: "low-poly-fox",
    label: "2 · Low poly fox",
    path: "/low_poly_fox.glb",
  },
];

export const DEFAULT_DEMO_MODEL_ID = DEMO_MODELS[0].id;

export function getDemoModelById(id) {
  return DEMO_MODELS.find((model) => model.id === id) ?? DEMO_MODELS[0];
}
