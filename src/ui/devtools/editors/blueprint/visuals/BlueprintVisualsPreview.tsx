import React, { useEffect, useRef, useState } from "react";
import type { ModuleCartridge } from "../../../../../data/schemas/module";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import { LayoutWorldAdapter } from "../../../layout/context/LayoutWorldAdapter";
import { LayoutRuntimeCanvas } from "../../../layout/LayoutRuntimeCanvas";
import { useLayoutEditorTicker } from "../../../layout/useLayoutEditorTicker";
import { getPreviewSupport } from "./blueprintVisualsDraft";
import { createBlueprintVisualsPreviewRuntime } from "./createBlueprintVisualsPreviewRuntime";
import { PreviewEmpty, PreviewFrame } from "./BlueprintVisualsModal.styles";

interface BlueprintVisualsPreviewProps {
    draft: ModuleCartridge;
    blueprintId: string;
    enabled: boolean;
}

export const BlueprintVisualsPreview: React.FC<
    BlueprintVisualsPreviewProps
> = ({ draft, blueprintId, enabled }) => {
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const [runtime, setRuntime] = useState<Runtime | null>(null);
    const support = getPreviewSupport(draft, blueprintId);

    useEffect(() => {
        if (!enabled || !support.supported) {
            setRuntime((current: Runtime | null) => {
                current?.destroy();
                return null;
            });
            return;
        }
        const next = createBlueprintVisualsPreviewRuntime(draft, blueprintId);
        setRuntime((current: Runtime | null) => {
            current?.destroy();
            return next;
        });
        return () => next?.destroy();
    }, [blueprintId, draft, enabled, support.supported]);

    useLayoutEditorTicker(runtime);

    if (!enabled || !support.supported || !runtime) {
        return (
            <PreviewEmpty>
                {support.reason ?? "Preview unavailable."}
            </PreviewEmpty>
        );
    }

    return (
        <PreviewFrame>
            <LayoutWorldAdapter runtime={runtime}>
                <LayoutRuntimeCanvas canvasRef={canvasRef} />
            </LayoutWorldAdapter>
        </PreviewFrame>
    );
};
