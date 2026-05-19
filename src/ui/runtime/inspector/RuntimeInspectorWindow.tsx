import type { Runtime } from "../../../engine/runtime/Runtime";
import type { RuntimeInspectorWindowRecord } from "./runtimeInspectorTypes";
import { runtimeInspectorStore } from "./runtimeInspectorStore";
import { useRuntimeInspectorEntity } from "./useRuntimeInspectorEntity";
import { useRuntimeInspectorWindowInteractions } from "./useRuntimeInspectorWindowInteractions";
import {
    ActionButton,
    ContentBlock,
    ContentScroller,
    ResizeHandle,
    WindowActions,
    WindowHeader,
    WindowShell,
    WindowTitle,
} from "./RuntimeInspectorViewport.styles";

export const RuntimeInspectorWindow = ({
    window,
    runtime,
}: {
    window: RuntimeInspectorWindowRecord;
    runtime: Runtime;
}) => {
    const { title, entityText } = useRuntimeInspectorEntity(
        runtime,
        window.id,
        window.entityId,
    );
    const interactions = useRuntimeInspectorWindowInteractions(
        window.id,
        window,
    );

    return (
        <WindowShell
            $x={window.x}
            $y={window.y}
            $width={window.width}
            $height={window.height}
            $zIndex={window.zIndex}
            aria-label={`Runtime inspector ${title}`}
            data-testid="runtime-inspector-window"
            onPointerDown={interactions.onWindowPointerDown}
        >
            <WindowHeader onPointerDown={interactions.onHeaderPointerDown}>
                <WindowTitle>{title}</WindowTitle>
                <WindowActions>
                    {window.mode === "selection" ? (
                        <ActionButton
                            type="button"
                            onClick={() =>
                                runtimeInspectorStore
                                    .getState()
                                    .pinWindow(window.id)
                            }
                        >
                            PIN
                        </ActionButton>
                    ) : null}
                    <ActionButton
                        type="button"
                        onClick={() =>
                            runtimeInspectorStore
                                .getState()
                                .closeWindow(window.id)
                        }
                    >
                        CLOSE
                    </ActionButton>
                </WindowActions>
            </WindowHeader>
            <ContentScroller>
                <ContentBlock>{entityText}</ContentBlock>
            </ContentScroller>
            <ResizeHandle
                aria-label={`Resize inspector ${title}`}
                type="button"
                onPointerDown={interactions.onResizeHandlePointerDown}
            />
        </WindowShell>
    );
};
