import React, { useEffect, useRef, useState } from "react";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import { useLayoutEditorTicker } from "../../../layout/useLayoutEditorTicker";
import { useModuleStore } from "../../../state/moduleStore";
import { useSessionStore } from "../../../state/useSessionStore";
import type { GuidanceDefinition } from "../../../../../data/schemas/guidances";
import { PreviewEmpty } from "../../blueprint/visuals/BlueprintVisualsModal.styles";

type Factory =
    typeof import("./createGuidancePreviewRuntime").createGuidancePreviewRuntime;
type LayoutWorldAdapterComponent = React.ComponentType<{
    runtime: Runtime;
    children: React.ReactNode;
}>;
type LayoutRuntimeCanvasComponent = React.ComponentType<{
    canvasRef: React.RefObject<HTMLDivElement | null>;
}>;
type Renderer = React.ComponentType<{
    runtime: Runtime;
    canvasRef: React.RefObject<HTMLDivElement | null>;
}>;

const createRenderer = (
    LayoutWorldAdapter: LayoutWorldAdapterComponent,
    LayoutRuntimeCanvas: LayoutRuntimeCanvasComponent,
): Renderer => {
    const PreviewRenderer: Renderer = ({ runtime, canvasRef }) => (
        <LayoutWorldAdapter runtime={runtime}>
            <LayoutRuntimeCanvas canvasRef={canvasRef} />
        </LayoutWorldAdapter>
    );
    return PreviewRenderer;
};

export const GuidancePreview: React.FC<{
    filename: string;
    guidance: GuidanceDefinition;
}> = ({ filename, guidance }) => {
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const [runtime, setRuntime] = useState<Runtime | null>(null);
    const [factory, setFactory] = useState<Factory | null>(null);
    const [Renderer, setRenderer] = useState<Renderer | null>(null);
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
            import("./createGuidancePreviewRuntime"),
            import("../../../layout/context/LayoutWorldAdapter"),
            import("../../../layout/LayoutRuntimeCanvas"),
        ])
            .then(([preview, adapter, canvas]) => {
                if (!active) return;
                setFactory(() => preview.createGuidancePreviewRuntime);
                setRenderer(() =>
                    createRenderer(
                        adapter.LayoutWorldAdapter,
                        canvas.LayoutRuntimeCanvas,
                    ),
                );
            })
            .catch(() => active && setRenderer(null));
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!factory || !source) return;
        let next: Runtime | null = null;
        try {
            next = factory(source, guidance);
        } catch (error) {
            console.error(error);
        }
        setRuntime((current) => {
            current?.destroy();
            return next;
        });
        return () => next?.destroy();
    }, [factory, guidance, source]);

    useLayoutEditorTicker(runtime);
    if (!runtime || !Renderer)
        return <PreviewEmpty>Preview unavailable.</PreviewEmpty>;
    return <Renderer runtime={runtime} canvasRef={canvasRef} />;
};
