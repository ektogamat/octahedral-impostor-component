import { extend } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { inspectorSettings } from "../dev/inspectorSettings";
import { enableInspector } from "../dev/devSettings";

export async function createWebGPURenderer(props) {
  extend(THREE);

  const renderer = new THREE.WebGPURenderer({
    ...props,
    antialias: true,
    samples: 8,
  });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.alpha = false;
  // Overbright clear so ACES still lands near pure white (1,1,1 → ~0.8 gray).
  renderer.setClearColor(new THREE.Color(2.2, 2.2, 2.2), 1);

  await renderer.init();

  if (import.meta.env.DEV) {
    inspectorSettings.registerRenderer(renderer);

    if (enableInspector) {
      void inspectorSettings.show();
    }
  }

  return renderer;
}
