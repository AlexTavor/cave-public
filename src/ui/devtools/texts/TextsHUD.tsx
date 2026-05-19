import { Button } from "../../lib/atoms/button";
import {
    TextsHudActions,
    TextsHudBadge,
    TextsHudCard,
    TextsHudSubtitle,
} from "./TextsHUD.styles";

interface TextsHUDProps {
    onAbort: () => void;
    onSave: () => void;
    disableSave?: boolean;
}

export const TextsHUD = ({ onAbort, onSave, disableSave }: TextsHUDProps) => {
    return (
        <TextsHudCard>
            <div>
                <TextsHudBadge>Texts Mode</TextsHudBadge>
                <TextsHudSubtitle>
                    Edit project prose with live RichText preview
                </TextsHudSubtitle>
            </div>
            <TextsHudActions>
                <Button variant="ghost" onClick={onAbort}>
                    ABORT
                </Button>
                <Button
                    variant="primary"
                    onClick={onSave}
                    disabled={disableSave}
                >
                    SAVE
                </Button>
            </TextsHudActions>
        </TextsHudCard>
    );
};
