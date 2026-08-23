import { extend } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { inspectorSettings } from "../dev/inspectorSettings";
import { enableInspector } from "../dev/devSettings";

export async function createWebGPURenderer(props) {
  extend(THREE);

  const renderer = new THREE.WebGPURenderer({
    ...props,
  });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.alpha = false;
  renderer.setClearColor(0xe4e4e8, 1);

  await renderer.init();

  if (import.meta.env.DEV) {
    inspectorSettings.registerRenderer(renderer);

    if (enableInspector) {
      void inspectorSettings.show();
    }
  }

  return renderer;
}
