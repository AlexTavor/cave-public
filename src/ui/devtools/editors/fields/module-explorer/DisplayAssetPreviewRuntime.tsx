import React, { useEffect, useRef, useState } from "react";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import { useModuleStore } from "../../../state/moduleStore";
import { useSessionStore } from "../../../state/useSessionStore";
import { useRuntimeStore } from "../../../../runtime/state/useRuntimeStore";
import { createLayoutRuntime } from "../../../layout/simulation/createLayoutRuntime";
import { LayoutWorldAdapter } from "../../../layout/context/LayoutWorldAdapter";
import { LayoutRuntimeCanvas } from "../../../layout/LayoutRuntimeCanvas";
import { useLayoutEditorTicker } from "../../../layout/useLayoutEditorTicker";

const HiddenPreviewHost: React.CSSProperties = {
    position: "absolute",
    width: 1,
    height: 1,
    overflow: "hidden",
    opacity: 0,
    pointerEvents: "none",
};

export const DisplayAssetPreviewRuntime: React.FC<{ filename: string }> = ({
    filename,
}) => {
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const [runtime, setRuntime] = useState<Runtime | null>(null);
    const liveRuntime = useRuntimeStore((state) => state.runtime);
    const sessionDraft = useSessionStore(
        (state) => state.sessions[filename]?.draft ?? null,
    );
    const moduleData = useModuleStore(
        (state) => state.modules[filename] ?? null,
    );
    const source = sessionDraft ?? moduleData;

    useEffect(() => {
        if (liveRuntime || !source) {
            setRuntime((current) => {
                current?.destroy();
                return null;
            });
            return;
        }
        const next = createLayoutRuntime(source);
        setRuntime((current) => {
            current?.destroy();
            return next;
        });
        return () => next.destroy();
    }, [liveRuntime, source]);

    useLayoutEditorTicker(runtime);
    if (!runtime) return null;

    return (
        <div style={HiddenPreviewHost} aria-hidden>
            <LayoutWorldAdapter runtime={runtime}>
                <LayoutRuntimeCanvas canvasRef={canvasRef} />
            </LayoutWorldAdapter>
        </div>
    );
};
