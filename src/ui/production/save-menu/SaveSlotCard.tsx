import { Button } from "../../lib/atoms/button";
import { Card } from "../../lib/atoms/card";
import { SlotActions, SlotLabel, SlotRow } from "./SaveSlotCard.styles";

export interface SaveSlotCardProps {
    name: string;
    isCurrent: boolean;
    mode: "save" | "load";
    onSelect: () => void;
    onDelete: () => void;
}

export const SaveSlotCard = ({
    name,
    isCurrent,
    mode,
    onSelect,
    onDelete,
}: SaveSlotCardProps) => (
    <Card padding="md" variant="surface">
        <SlotRow>
            <SlotLabel>
                <strong>{name}</strong>
                {isCurrent ? <span>Current save</span> : null}
            </SlotLabel>
            <SlotActions>
                <Button onClick={onSelect} size="sm" type="button">
                    {mode === "save" ? "Overwrite" : "Load"}
                </Button>
                <Button
                    onClick={onDelete}
                    size="sm"
                    type="button"
                    variant="danger"
                >
                    Delete
                </Button>
            </SlotActions>
        </SlotRow>
    </Card>
);
