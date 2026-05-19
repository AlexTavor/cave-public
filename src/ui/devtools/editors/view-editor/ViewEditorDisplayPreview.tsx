import React, { useEffect, useRef, useState } from "react";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import { useLayoutEditorTicker } from "../../layout/useLayoutEditorTicker";
import { useModuleStore } from "../../state/moduleStore";
import { useSessionStore } from "../../state/useSessionStore";
import {
    PreviewEmpty,
    PreviewFrame,
} from "../blueprint/visuals/BlueprintVisualsModal.styles";
import type { createDisplayAssetPreviewRuntime } from "./createDisplayAssetPreviewRuntime";

type RuntimeFactory = typeof createDisplayAssetPreviewRuntime;
type LayoutWorldAdapterComponent = React.ComponentType<{
    runtime: Runtime;
    children: React.ReactNode;
}>;
type LayoutRuntimeCanvasComponent = React.ComponentType<{
    canvasRef: React.RefObject<HTMLDivElement | null>;
}>;
type PreviewRenderer = React.ComponentType<{
    runtime: Runtime;
    canvasRef: React.RefObject<HTMLDivElement | null>;
}>;

const createPreviewRenderer = (
    LayoutWorldAdapter: LayoutWorldAdapterComponent,
    LayoutRuntimeCanvas: LayoutRuntimeCanvasComponent,
): PreviewRenderer => {
    const PreviewRendererComponent: PreviewRenderer = ({
        runtime,
        canvasRef,
    }) => (
        <PreviewFrame>
            <LayoutWorldAdapter runtime={runtime}>
                <LayoutRuntimeCanvas canvasRef={canvasRef} />
            </LayoutWorldAdapter>
        </PreviewFrame>
    );
    return PreviewRendererComponent;
};

export const ViewEditorDisplayPreview: React.FC<{
    cycleProgressPreview?: number;
    displayKey: string;
    filename: string;
}> = ({ cycleProgressPreview = 100, displayKey, filename }) => {
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const [runtime, setRuntime] = useState<Runtime | null>(null);
    const [factory, setFactory] = useState<RuntimeFactory | null>(null);
    const [renderer, setRenderer] = useState<PreviewRenderer | null>(null);
    const moduleData = useModuleStore(
        (state) => state.modules[filename] ?? null,
    );
    const sessionDraft = useSessionStore(
        (state) => state.sessions[filename]?.draft ?? null,
    );
    const source = sessionDraft ?? moduleData;

    useEffect(() => {
        let active = true;
        Promise.all([
            import("./createDisplayAssetPreviewRuntime"),
            import("../../layout/context/LayoutWorldAdapter"),
            import("../../layout/LayoutRuntimeCanvas"),
        ])
            .then(([preview, adapter, canvas]) => {
                if (!active) return;
                setFactory(() => preview.createDisplayAssetPreviewRuntime);
                setRenderer(() =>
                    createPreviewRenderer(
                        adapter.LayoutWorldAdapter,
                        canvas.LayoutRuntimeCanvas,
                    ),
                );
            })
            .catch(() => {
                if (!active) return;
                setFactory(null);
                setRenderer(null);
            });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!source || !factory) {
            setRuntime((current) => {
                current?.destroy();
                return null;
            });
            return;
        }
        const next = factory(source, displayKey, cycleProgressPreview);
        setRuntime((current) => {
            current?.destroy();
            return next;
        });
        return () => next.destroy();
    }, [cycleProgressPreview, displayKey, factory, source]);

    useLayoutEditorTicker(runtime);
    if (!runtime || !renderer)
        return <PreviewEmpty>Preview unavailable.</PreviewEmpty>;
    return React.createElement(renderer, { runtime, canvasRef });
};
