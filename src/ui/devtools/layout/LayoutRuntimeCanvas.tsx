import type { RefObject } from "react";
import { usePhaserGame } from "../../runtime/world/usePhaserGame";
import { GameCanvas } from "../../runtime/shell/RuntimeShell.styles";

export interface LayoutRuntimeCanvasProps {
    canvasRef: RefObject<HTMLDivElement | null>;
}

export const LayoutRuntimeCanvas = ({
    canvasRef,
}: LayoutRuntimeCanvasProps) => {
    usePhaserGame({
        containerRef: canvasRef,
        backgroundColor: "transparent",
    });

    return <GameCanvas ref={canvasRef} />;
};
