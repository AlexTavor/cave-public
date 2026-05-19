import { Button } from "../../lib/atoms/button";
import {
    ActionContent,
    ActionDescription,
    ActionLabel,
} from "./MainMenuActionCard.styles";

export interface MainMenuActionCardProps {
    label: string;
    description: string;
    tone: "primary" | "default";
    disabled: boolean;
    onSelect: () => void;
}

export const MainMenuActionCard = ({
    label,
    description,
    tone,
    disabled,
    onSelect,
}: MainMenuActionCardProps) => (
    <Button disabled={disabled} fullWidth onClick={onSelect} variant="ghost">
        <ActionContent>
            <ActionLabel $tone={tone}>{label}</ActionLabel>
            <ActionDescription>{description}</ActionDescription>
        </ActionContent>
    </Button>
);
