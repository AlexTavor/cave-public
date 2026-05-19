import { useWorldInteraction } from "../world/context/WorldInteractionContext";
import {
    selectRuntimeInspectorWindows,
    useRuntimeInspectorStore,
} from "./runtimeInspectorStore";
import { useRuntimeInspectorEnabled } from "./useRuntimeInspectorEnabled";
import { useRuntimeInspectorSync } from "./useRuntimeInspectorSync";
import { RuntimeInspectorWindow } from "./RuntimeInspectorWindow";
import { ViewportRoot } from "./RuntimeInspectorViewport.styles";

export const RuntimeInspectorViewport = () => {
    const enabled = useRuntimeInspectorEnabled();
    const { runtime } = useWorldInteraction();
    const windows = useRuntimeInspectorStore(selectRuntimeInspectorWindows);
    useRuntimeInspectorSync();

    if (!enabled || runtime === null || windows.length === 0) return null;

    return (
        <ViewportRoot data-testid="runtime-inspector-viewport">
            {[...windows]
                .sort((left, right) => left.zIndex - right.zIndex)
                .map((window) => (
                    <RuntimeInspectorWindow
                        key={window.id}
                        runtime={runtime}
                        window={window}
                    />
                ))}
        </ViewportRoot>
    );
};
