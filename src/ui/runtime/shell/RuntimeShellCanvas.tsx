import { useContext, useEffect, useRef, useState } from "react";
import { EntityStateLinkProvider } from "../world/entity-state-link";
import { usePhaserGame } from "../../../engine/phaser/hooks/usePhaserGame";
import { SelectionOverlay } from "../world/SelectionOverlay";
import { DraftOverlay } from "../draft";
import { DormancyOverlay } from "../dormancy";
import { RuntimeNotificationViewport } from "../notifications/RuntimeNotificationViewport";
import { RuntimeModalGuidanceOverlay } from "../modal-guidance/RuntimeModalGuidanceOverlay";
import { RuntimeClock } from "../status/RuntimeClock";
import { useTutorialAttentionCameraFocus } from "../tutorials/useTutorialAttentionCameraFocus";
import { useTutorialAttentionPlayback } from "../tutorials/useTutorialAttentionPlayback";
import { usePersistTutorialCompletionMemory } from "../tutorials/usePersistTutorialCompletionMemory";
import { usePersistTutorialMode } from "../tutorials/usePersistTutorialMode";
import { RuntimeHabitiGainModal } from "../habiti/RuntimeHabitiGainModal";
import { RuntimeInspectorViewport } from "../inspector/RuntimeInspectorViewport";
import { NodeOverlayViewport } from "../world/node-overlays";
import { RuntimeRunStartCycleBanner } from "../status/RunStartCycleBanner";
import { GameCanvas, RuntimeViewport, ShellRoot } from "./RuntimeShell.styles";
import { WorldInteractionContext } from "../world/context/WorldInteractionContext";
import { useRuntimeStore } from "../state/useRuntimeStore";

export interface RuntimeShellCanvasProps {
    chrome?: "full" | "minimal";
    hiddenUntilTick?: number;
    inputTarget?: "canvas" | "window";
}

export const RuntimeShellCanvas = ({
    chrome = "full",
    hiddenUntilTick = 2,
    inputTarget = "canvas",
}: RuntimeShellCanvasProps) => {
    const gameCanvasRef = useRef<HTMLDivElement>(null);
    const context = useContext(WorldInteractionContext);
    const storeRuntime = useRuntimeStore((state) => state.runtime);
    const runtime = context?.runtime ?? storeRuntime;
    const [isVisible, setIsVisible] = useState(false);
    const canvasStyle = { opacity: isVisible ? 1 : 0, touchAction: "none" };

    useTutorialAttentionPlayback();
    useTutorialAttentionCameraFocus();
    usePersistTutorialCompletionMemory();
    usePersistTutorialMode();

    useEffect(() => {
        const nextVisible =
            runtime !== null && runtime.getState().tick > hiddenUntilTick;
        setIsVisible(nextVisible);
        if (nextVisible || runtime === null) return;
        let frame = 0;
        const poll = () => {
            if (runtime.getState().tick > hiddenUntilTick) {
                setIsVisible(true);
                return;
            }
            frame = globalThis.requestAnimationFrame(poll);
        };
        frame = globalThis.requestAnimationFrame(poll);
        return () => globalThis.cancelAnimationFrame(frame);
    }, [hiddenUntilTick, runtime]);

    usePhaserGame({ containerRef: gameCanvasRef, inputTarget });
    let chromeContent: React.ReactNode = null;
    if (chrome === "full") {
        chromeContent = (
            <EntityStateLinkProvider>
                <SelectionOverlay />
                <NodeOverlayViewport />
                <DraftOverlay />
                <RuntimeModalGuidanceOverlay />
                <RuntimeHabitiGainModal />
                <DormancyOverlay />
                <RuntimeInspectorViewport />
                <RuntimeNotificationViewport />
                <RuntimeRunStartCycleBanner />
                <RuntimeClock />
            </EntityStateLinkProvider>
        );
    }

    return (
        <ShellRoot>
            <RuntimeViewport>
                <GameCanvas
                    id="game-canvas"
                    ref={gameCanvasRef}
                    style={canvasStyle}
                />
                {chromeContent}
            </RuntimeViewport>
        </ShellRoot>
    );
};
