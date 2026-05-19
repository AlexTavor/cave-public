import { LayoutWorldAdapter } from "./context/LayoutWorldAdapter";
import { EntityStateLinkProvider } from "../../runtime/world/entity-state-link";
import { SelectionOverlay } from "../../runtime/world/SelectionOverlay";
import { LayoutHUD } from "./LayoutHUD";
import { LayoutRuntimeCanvas } from "./LayoutRuntimeCanvas";
import {
    CanvasAnchor,
    LayoutViewport,
    OverlayRoot,
    StageChrome,
    LoadingState,
} from "./LayoutEditor.styles";
import { useLayoutEditorController } from "./useLayoutEditorController";

export interface LayoutEditorProps {
    readonly manifestPath: string;
}

export function LayoutEditor({ manifestPath }: LayoutEditorProps) {
    const {
        canvasRef,
        runtime,
        isLoading,
        isReady,
        handleCancel,
        handleConfirm,
    } = useLayoutEditorController(manifestPath);

    return (
        <OverlayRoot>
            <StageChrome>
                <LayoutWorldAdapter runtime={runtime}>
                    <LayoutViewport>
                        <CanvasAnchor>
                            <LayoutRuntimeCanvas canvasRef={canvasRef} />
                        </CanvasAnchor>
                        <EntityStateLinkProvider>
                            <SelectionOverlay />
                            {isLoading && (
                                <LoadingState>Loading Runtime</LoadingState>
                            )}
                            <LayoutHUD
                                onCancel={handleCancel}
                                onConfirm={handleConfirm}
                                disableConfirm={!isReady}
                            />
                        </EntityStateLinkProvider>
                    </LayoutViewport>
                </LayoutWorldAdapter>
            </StageChrome>
        </OverlayRoot>
    );
}

