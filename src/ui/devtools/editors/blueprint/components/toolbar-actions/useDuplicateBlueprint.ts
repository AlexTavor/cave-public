import { useShellStore } from "../../../../shell/shell";
import { useModuleStore } from "../../../../state/moduleStore";
import { useBlueprintContext } from "../../BlueprintContext.tsx";

export function useDuplicateBlueprint() {
    const { filename, blueprintId } = useBlueprintContext();
    const duplicateBlueprint = useModuleStore((s) => s.duplicateBlueprint);
    const { log } = useShellStore();

    const handleDuplicate = async () => {
        if (!filename || !blueprintId) return;
        try {
            const newId = await duplicateBlueprint({ filename, blueprintId });
            log("success", `Duplicated to ${newId}`);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            log("error", `Failed to duplicate: ${msg}`);
        }
    };

    return { handleDuplicate };
}
