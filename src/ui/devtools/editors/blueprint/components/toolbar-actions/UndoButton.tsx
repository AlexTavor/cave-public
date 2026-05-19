import { Button } from "../../../../../lib/atoms/button";
import { useUnifiedUndo } from "../../../../state/useUnifiedUndo";

export const UndoButton = () => {
    const { canUndo, isBusy, undo } = useUnifiedUndo();

    return (
        <Button
            size="sm"
            variant="ghost"
            disabled={!canUndo || isBusy}
            onClick={() => void undo()}
        >
            Undo
        </Button>
    );
};
