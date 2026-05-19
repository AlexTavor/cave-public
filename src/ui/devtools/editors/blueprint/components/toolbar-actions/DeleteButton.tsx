import { Button } from "../../../../../lib/atoms/button";
import { useSessionStore } from "../../../../state/useSessionStore";
import { useBlueprintContext } from "../../BlueprintContext";

export const DeleteButton = () => {
    const { filename, scopeId } = useBlueprintContext();
    const updateSessionUi = useSessionStore((s) => s.updateSessionUi);

    const handleOpen = () => {
        updateSessionUi(filename, scopeId, (ui) => {
            ui.isDeleteOpen = true;
        });
    };

    return (
        <Button size="sm" variant="ghost" onClick={handleOpen}>
            Delete
        </Button>
    );
};
