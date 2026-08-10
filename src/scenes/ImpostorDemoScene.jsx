import { Suspense, useMemo, useRef } from "react";
import { useOctahedralAtlas } from "../impostor/hooks/useOctahedralAtlas";
import { getSamplingCache } from "../impostor/utils/octahedralImpostorMath";
import { buildOctahedralMesh } from "../impostor/utils/octahedralHelper";
import {
  ImpostorDemoContext,
  DEMO_ATLAS_SIZE,
  DEMO_GRID_SIZE,
  DEMO_OCT_TYPE,
  createEmptySample,
} from "../impostor/impostorDemoStore";
import { useImpostorSourceMesh } from "../impostor/CoconutTreeMesh";
import { getDemoModelById } from "../impostor/demoModels";
import AtlasDebugView from "../impostor/views/AtlasDebugView";
import CaptureRigDebugView from "../impostor/views/CaptureRigDebugView";
import MainComparisonView from "../impostor/views/MainComparisonView";
import { LockedAtlasCamera, LockedRigCamera } from "../impostor/LockedCameras";
import TrackedView from "../impostor/TrackedView";

export default function ImpostorDemoScene({
  atlasViewRef,
  rigViewRef,
  mainViewRef,
  showImpostors,
  showBillboards,
  wireframe,
  impostorCount,
  scaleVariance,
  modelId,
  statsElementRef,
}) {
  const activeSampleRef = useRef(createEmptySample());
  const demoModel = getDemoModelById(modelId);
  const meshData = useImpostorSourceMesh(demoModel.path);

  const { atlas, error, isGenerating, octahedralData } = useOctahedralAtlas({
    mesh: meshData?.meshGroup ?? null,
    gridSize: DEMO_GRID_SIZE,
    atlasSize: DEMO_ATLAS_SIZE,
    octType: DEMO_OCT_TYPE,
    enabled: Boolean(meshData?.meshGroup),
  });

  const samplingCache = useMemo(
    () => getSamplingCache(DEMO_OCT_TYPE, DEMO_GRID_SIZE),
    [],
  );

  const fallbackOctahedralData = useMemo(
    () => buildOctahedralMesh(DEMO_OCT_TYPE, DEMO_GRID_SIZE),
    [],
  );

  const treeScale = useMemo(() => {
    if (!meshData) return 1;
    const targetHeight = 2.4;
    return targetHeight / Math.max(meshData.height, 0.001);
  }, [meshData]);

  const worldHeight = (meshData?.height ?? 1) * treeScale;
  const worldWidth =
    Math.max(meshData?.size?.x ?? 1, meshData?.size?.z ?? 1) * treeScale;

  const demoValue = useMemo(
    () => ({
      showImpostors,
      showBillboards,
      wireframe,
      atlas,
      isGenerating,
      atlasError: error,
      octahedralData:
        atlas?.octahedralData ?? octahedralData ?? fallbackOctahedralData,
      samplingCache,
      activeSampleRef,
      meshGroup: meshData?.meshGroup ?? null,
      modelTriangleCount: meshData?.triangleCount ?? 0,
      impostorCount,
      treeScale,
      worldHeight,
      worldWidth,
      treeYOffset: 0,
    }),
    [
      showImpostors,
      showBillboards,
      wireframe,
      atlas,
      isGenerating,
      error,
      octahedralData,
      fallbackOctahedralData,
      samplingCache,
      meshData,
      impostorCount,
      treeScale,
      worldHeight,
      worldWidth,
    ],
  );

  return (
    <ImpostorDemoContext.Provider value={demoValue}>
      <TrackedView track={atlasViewRef} index={1}>
        <color attach="background" args={["#0d0f12"]} />
        <LockedAtlasCamera />
        <Suspense fallback={null}>
          <AtlasDebugView />
        </Suspense>
      </TrackedView>

      <TrackedView track={rigViewRef} index={2}>
        <color attach="background" args={["#131820"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 2]} intensity={0.8} />
        <LockedRigCamera worldHeight={worldHeight} worldWidth={worldWidth} />
        <Suspense fallback={null}>
          <CaptureRigDebugView meshData={meshData} treeScale={treeScale} />
        </Suspense>
      </TrackedView>

      <TrackedView track={mainViewRef} index={3}>
        <color attach="background" args={["#8fa888"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 8, 4]} intensity={1.4} />
        <Suspense fallback={null}>
          <MainComparisonView
            meshData={meshData}
            treeScale={treeScale}
            showImpostors={showImpostors}
            showBillboards={showBillboards}
            wireframe={wireframe}
            impostorCount={impostorCount}
            scaleVariance={scaleVariance}
            statsElementRef={statsElementRef}
          />
        </Suspense>
      </TrackedView>
    </ImpostorDemoContext.Provider>
  );
}
