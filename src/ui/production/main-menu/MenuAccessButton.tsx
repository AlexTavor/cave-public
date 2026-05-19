import { Button } from "../../lib/atoms/button";
import { SmartTooltip } from "../../lib/atoms/tooltip";
import { MenuButtonWrap } from "./MenuAccessButton.styles";

export interface MenuAccessButtonProps {
    visible: boolean;
    onOpenMenu: () => void;
    tooltipText: string;
}

export const MenuAccessButton = ({
    visible,
    onOpenMenu,
    tooltipText,
}: MenuAccessButtonProps) => {
    if (!visible) return null;
    return (
        <MenuButtonWrap>
            <SmartTooltip content={tooltipText}>
                <Button onClick={onOpenMenu} size="sm" type="button">
                    Menu
                </Button>
            </SmartTooltip>
        </MenuButtonWrap>
    );
};
