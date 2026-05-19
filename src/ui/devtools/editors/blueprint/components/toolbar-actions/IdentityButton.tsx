import { Button } from "../../../../../lib/atoms/button";
import { useSessionStore } from "../../../../state/useSessionStore";
import { useBlueprintContext } from "../../BlueprintContext";

export const IdentityButton = () => {
    const { filename, scopeId } = useBlueprintContext();
    const updateSessionUi = useSessionStore((s) => s.updateSessionUi);

    const handleOpen = () => {
        updateSessionUi(filename, scopeId, (ui) => {
            ui.isIdentityOpen = true;
        });
    };

    return (
        <Button size="sm" variant="ghost" onClick={handleOpen}>
            Identity
        </Button>
    );
};
