import { useEffect, useId, useRef, useState } from "react";

export default function InfoOverlay() {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, [open]);

  return (
    <>
      <div className="fab-actions">
        <button
          type="button"
          className="info-fab"
          aria-label="About octahedral impostors"
          aria-expanded={open}
          aria-controls="info-overlay"
          onClick={() => setOpen(true)}
        >
          <svg
            className="info-fab-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 256 256"
            aria-hidden="true"
          >
            <path d="M192,96c0,28.51-24.47,52.11-56,55.56V160a8,8,0,0,1-16,0V144a8,8,0,0,1,8-8c26.47,0,48-17.94,48-40s-21.53-40-48-40S80,73.94,80,96a8,8,0,0,1-16,0c0-30.88,28.71-56,64-56S192,65.12,192,96Zm-64,96a16,16,0,1,0,16,16A16,16,0,0,0,128,192Z" />
          </svg>
        </button>
      </div>

      <div
        id="info-overlay"
        className={`info-overlay${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!open}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div className="info-overlay-panel">
          <div className="info-overlay-header">
            <p className="info-overlay-eyebrow">WebGPU · TSL · R3F</p>
            <h2 id={titleId}>Octahedral impostors, explained visually</h2>
            <button
              ref={closeRef}
              type="button"
              className="info-overlay-close"
              aria-label="Close info"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="info-overlay-body">
            <p className="info-overlay-lead">
              A distant tree does not need thousands of leaves drawn every
              frame. An impostor captures the object from many directions into
              an atlas, then picks the right cells as the camera moves.
            </p>

            <section>
              <h3>Three synchronized views</h3>
              <p>
                The atlas panel shows the baked grid and highlights the active
                cell. The capture rig shows virtual cameras placed on a
                hemisphere around the mesh. The main view compares the real
                model with an optional radial field of impostor or billboard
                cards — switch models and count from the controls.
              </p>
            </section>

            <section>
              <h3>How sampling works</h3>
              <p>
                The view direction is encoded into octahedral UV space, mapped
                to a grid cell, then blended across three neighboring atlas
                frames using barycentric weights. Move the main camera and watch
                all three panels update together.
              </p>
            </section>

            <section>
              <h3>Demo controls</h3>
              <p>
                Impostor shows view-dependent atlas frames. Billboard uses the
                same field layout with one fixed image — look from above to see
                the classic “lying forest”. Wireframe reveals the flat quads.
              </p>
            </section>

            <footer className="info-overlay-footer">
              <a
                href="https://shaderbits.com/blog/octahedral-impostors"
                target="_blank"
                rel="noreferrer"
              >
                shaderbits.com/blog/octahedral-impostors
              </a>
            </footer>
          </div>
        </div>
      </div>
    </>
  );
}
