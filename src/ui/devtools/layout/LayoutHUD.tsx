import React from "react";
import { Button } from "../../lib/atoms/button";
import { HudActions, HudBadge, HudCard, HudSubtitle } from "./LayoutHUD.styles";

export interface LayoutHUDProps {
    onConfirm: () => void;
    onCancel: () => void;
    disableConfirm?: boolean;
}

export const LayoutHUD: React.FC<LayoutHUDProps> = ({
    onConfirm,
    onCancel,
    disableConfirm = false,
}) => {
    return (
        <HudCard>
            <div>
                <HudBadge>Layout Mode</HudBadge>
                <HudSubtitle>Drag entities into place</HudSubtitle>
            </div>
            <HudActions>
                <Button variant="ghost" onClick={onCancel}>
                    ABORT
                </Button>
                <Button
                    variant="primary"
                    onClick={onConfirm}
                    disabled={disableConfirm}
                >
                    SAVE
                </Button>
            </HudActions>
        </HudCard>
    );
};

