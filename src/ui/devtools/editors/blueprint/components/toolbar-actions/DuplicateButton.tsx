import { Button } from "../../../../../lib/atoms/button";
import { useDuplicateBlueprint } from "./useDuplicateBlueprint";

export function DuplicateButton() {
    const { handleDuplicate } = useDuplicateBlueprint();

    return (
        <Button size="sm" variant="ghost" onClick={handleDuplicate}>
            Duplicate
        </Button>
    );
}
