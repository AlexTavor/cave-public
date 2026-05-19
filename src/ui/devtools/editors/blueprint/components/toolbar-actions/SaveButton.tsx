import { Button } from "../../../../../lib/atoms/button";
import { useTerminalStore } from "../../../../state/useTerminalStore";
import { useSessionStore } from "../../../../state/useSessionStore";
import { useRuntimeStore } from "../../../../../runtime/state/useRuntimeStore";
import { useBlueprintContext } from "../../BlueprintContext";
import { useBlueprintSlice } from "../../../../state/moduleSession/useBlueprintSlice";
import {
    useEnsureModuleSession,
    useModuleSession,
} from "../../../../state/moduleSession";
import { RuntimeCommandType } from "../../../../../../engine/runtime/types";
import { useBlueprintValidation } from "../../hooks/useBlueprintValidation";
import { resolveVisualAssetFilename } from "../../visuals/visualAssetLinking";

export const SaveButton = () => {
    const { filename, blueprintId } = useBlueprintContext();
    const blueprint = useBlueprintSlice(filename, blueprintId);
    const moduleSession = useModuleSession(filename);
    const assetFilename = resolveVisualAssetFilename(filename);
    useEnsureModuleSession(assetFilename);
    const assetSession = useModuleSession(assetFilename);
    const { hasErrors } = useBlueprintValidation(blueprint);

    // Subscribe to dirty state
    const isDirty = useSessionStore((s) => s.sessions[filename]?.isDirty);

    const runtime = useRuntimeStore((s) => s.runtime);

    const { addLog } = useTerminalStore();

    const handleSave = async () => {
        if (!filename || !blueprintId || !blueprint) return;

        try {
            if (assetSession.isDirty) {
                await assetSession.save();
            }
            await moduleSession.save();

            if (runtime) {
                runtime.commands.enqueue({
                    type: RuntimeCommandType.PATCH_BLUEPRINT,
                    payload: {
                        blueprintId,
                        components: blueprint.components ?? {},
                    },
                });
            }
            addLog({ type: "success", content: "Blueprint saved" });
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            addLog({ type: "error", content: `Failed to save: ${msg}` });
        }
    };

    return (
        <Button
            size="sm"
            variant={hasErrors ? "danger" : "primary"}
            disabled={!isDirty && !assetSession.isDirty}
            onClick={handleSave}
            title={
                hasErrors ? "Invalid Abilities will not be saved" : undefined
            }
        >
            Save
        </Button>
    );
};

