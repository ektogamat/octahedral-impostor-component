import { useRef } from "react";
import TreesCanvas from "../canvas/TreesCanvas";
import RecordingOverlay from "./RecordingOverlay";
import useRecordingTimeline from "../hooks/useRecordingTimeline";
import "./trees-demo.css";

export default function App() {
  const layoutRef = useRef(null);
  const { treeCount, fakeFps, triangleCount } = useRecordingTimeline();

  return (
    <div className="trees-demo-root">
      <div ref={layoutRef} className="trees-demo-view">
        <RecordingOverlay
          treeCount={treeCount}
          fakeFps={fakeFps}
          triangleCount={triangleCount}
        />
      </div>

      <TreesCanvas layoutRef={layoutRef} treeCount={treeCount} />
    </div>
  );
}
