import { useEffect, useState } from "react";
import { View } from "@react-three/drei";

function useTrackReady(trackRef) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let frame = 0;
    let observer = null;

    const update = () => {
      const element = trackRef?.current;
      if (!element) {
        frame = requestAnimationFrame(update);
        return;
      }

      if (!observer) {
        observer = new ResizeObserver(update);
        observer.observe(element);
      }

      const { width, height } = element.getBoundingClientRect();
      setReady(width > 2 && height > 2);
    };

    update();
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [trackRef]);

  return ready;
}

export default function TrackedView({ track, children, index, ...props }) {
  const ready = useTrackReady(track);

  if (!ready) {
    return null;
  }

  return (
    <View track={track} visible index={index} {...props}>
      {children}
    </View>
  );
}
