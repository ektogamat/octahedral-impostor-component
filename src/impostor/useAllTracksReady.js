import { useEffect, useState } from "react";

export default function useAllTracksReady(atlasRef, rigRef, mainRef) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let frame = 0;
    let observer = null;

    const refs = [atlasRef, rigRef, mainRef];

    const update = () => {
      const elements = refs.map((ref) => ref.current).filter(Boolean);

      if (elements.length !== refs.length) {
        frame = requestAnimationFrame(update);
        return;
      }

      const allReady = elements.every((element) => {
        const { width, height } = element.getBoundingClientRect();
        return width > 2 && height > 2;
      });

      setReady(allReady);
    };

    update();

    observer = new ResizeObserver(update);
    refs.forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [atlasRef, rigRef, mainRef]);

  return ready;
}
