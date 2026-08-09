const params = new URLSearchParams(globalThis.location?.search ?? "");

/** Enable three.js Inspector via `?inspector=1` (off by default in dev). */
export const enableInspector = params.get("inspector") === "1";
