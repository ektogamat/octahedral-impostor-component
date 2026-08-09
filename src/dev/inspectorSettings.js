let rendererRef = null;
let inspectorRef = null;
let initPromise = null;

export const inspectorSettings = {
  visible: false,
  loading: false,

  registerRenderer(renderer) {
    rendererRef = renderer;
  },

  async ensureInspector() {
    if (inspectorRef) return inspectorRef;
    if (!rendererRef) return null;

    if (initPromise) return initPromise;

    initPromise = (async () => {
      const { Inspector } = await import("three/addons/inspector/Inspector.js");
      const inspector = new Inspector();
      rendererRef.inspector = inspector;
      inspector.init();
      inspectorRef = inspector;
      globalThis.__inspector = inspector;
      return inspector;
    })();

    try {
      return await initPromise;
    } catch (error) {
      initPromise = null;
      throw error;
    }
  },

  async show() {
    this.loading = true;

    try {
      await this.ensureInspector();
      this.setVisible(true);
    } finally {
      this.loading = false;
    }
  },

  hide() {
    this.setVisible(false);
  },

  async toggle() {
    if (this.visible) {
      this.hide();
      return;
    }

    await this.show();
  },

  setVisible(visible) {
    this.visible = visible;

    if (inspectorRef?.domElement) {
      inspectorRef.domElement.style.display = visible ? "" : "none";
    }
  },
};

if (import.meta.env.DEV) {
  globalThis.__inspectorSettings = inspectorSettings;
}
