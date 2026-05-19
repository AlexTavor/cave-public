import { Button } from "../../../../../lib/atoms/button";
import { useUnifiedUndo } from "../../../../state/useUnifiedUndo";

export const RedoButton = () => {
    const { canRedo, isBusy, redo } = useUnifiedUndo();

    return (
        <Button
            size="sm"
            variant="ghost"
            disabled={!canRedo || isBusy}
            onClick={() => void redo()}
        >
            Redo
        </Button>
    );
};
