import { useContext, useEffect, useRef } from "react";
import { useTheme } from "@emotion/react";
import Phaser from "phaser";
import { WorldInteractionContext } from "./context/WorldInteractionContext";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { GameScene } from "../../../engine/phaser/scenes/GameScene";
import type { RuntimeEntity } from "../../../engine/runtime/types";
import { createDebugGame, destroyPhaserGame } from "../../../engine/phaser/hooks/destroyPhaserGame";

export interface UsePhaserGameParams {
    containerRef: React.RefObject<HTMLDivElement | null>;
    backgroundColor?: string;
    inputTarget?: "canvas" | "window";
}

export const usePhaserGame = ({
    containerRef,
    backgroundColor,
    inputTarget = "canvas",
}: UsePhaserGameParams): void => {
    const theme = useTheme();
    const context = useContext(WorldInteractionContext);
    const storeRuntime = useRuntimeStore((state) => state.runtime);
    const runtime = context?.runtime ?? storeRuntime;
    const selectedEntityId = context?.selectedEntityId ?? null;
    const selectEntity = context?.selectEntity ?? (() => {});
    const getCameraState = context?.getCameraState ?? (() => null);
    const setCameraState = context?.setCameraState ?? (() => {});
    const consumeRestore = context?.consumePendingCameraRestore ?? (() => null);
    const consumeRuntimeVisualEffects =
        context?.consumeRuntimeVisualEffects ?? (() => []);
    const runtimeRef = useRef(runtime);
    const selectedIdRef = useRef(selectedEntityId);
    const selectRef = useRef(selectEntity);
    const getCamRef = useRef(getCameraState);
    const setCamRef = useRef(setCameraState);
    const restoreRef = useRef(consumeRestore);
    const consumeEffectsRef = useRef(consumeRuntimeVisualEffects);
    const backgroundColorRef = useRef(
        backgroundColor ?? theme.colors.background,
    );
    const rendererPreference = context?.rendererPreference ?? "auto";
    const rendererTypeRef = useRef(rendererPreference);
    const inputTargetRef = useRef(inputTarget);
    const gameRef = useRef<Phaser.Game | null>(null);
    const debugGameIdRef = useRef<string | null>(null);
    const shouldRenderEntity = context?.shouldRenderEntity;
    const shouldRenderEntityRef = useRef<
        ((entity: RuntimeEntity) => boolean) | undefined
    >(shouldRenderEntity);

    // Keep the refs the Phaser scene closures read fresh. Synced in an effect
    // (not during render) so the UI react-hooks/refs rule is satisfied; the
    // scene reads them asynchronously from the game loop, so post-render is fine.
    useEffect(() => {
        runtimeRef.current = runtime;
        selectedIdRef.current = selectedEntityId;
        selectRef.current = selectEntity;
        getCamRef.current = getCameraState;
        setCamRef.current = setCameraState;
        restoreRef.current = consumeRestore;
        consumeEffectsRef.current = consumeRuntimeVisualEffects;
        backgroundColorRef.current = backgroundColor ?? theme.colors.background;
        rendererTypeRef.current = rendererPreference;
        inputTargetRef.current = inputTarget;
        shouldRenderEntityRef.current = shouldRenderEntity;
    });

    useEffect(() => {
        if (runtime === null) {
            destroyPhaserGame({ gameRef, debugGameIdRef });
            return;
        }
        if (!containerRef.current || gameRef.current) return;

        const scene = new GameScene({
            getRuntime: () => runtimeRef.current,
            getSelectedEntityId: () => selectedIdRef.current,
            selectEntity: (id) => selectRef.current(id),
            getCameraState: () => getCamRef.current(),
            setCameraState: (s) => setCamRef.current(s),
            consumePendingCameraRestore: () => restoreRef.current(),
            consumeRuntimeVisualEffects: () => consumeEffectsRef.current(),
            shouldRenderEntity: (entity) =>
                shouldRenderEntityRef.current?.(entity) ?? true,
        });

        const config: Phaser.Types.Core.GameConfig = {
            type:
                rendererTypeRef.current === "canvas"
                    ? Phaser.CANVAS
                    : Phaser.AUTO,
            width: window.innerWidth,
            height: window.innerHeight,
            parent: containerRef.current,
            scene: [scene],
            backgroundColor: backgroundColorRef.current,
            scale: {
                mode: Phaser.Scale.RESIZE,
            },
            input:
                inputTargetRef.current === "window"
                    ? {
                          mouse: { target: globalThis },
                          touch: { target: globalThis },
                      }
                    : undefined,
        };

        gameRef.current = new Phaser.Game(config);
        debugGameIdRef.current = createDebugGame();
    }, [containerRef, runtime]);

    useEffect(() => () => destroyPhaserGame({ gameRef, debugGameIdRef }), []);
};

