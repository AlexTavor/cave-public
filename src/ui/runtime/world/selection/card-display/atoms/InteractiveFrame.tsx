import React from "react";
import styled from "@emotion/styled";
import type {
    CardDisplayAction,
    CardDisplayActionHandler,
} from "../cardDisplayTypes";
import { InfoAffordance } from "./InfoAffordance";

const PassiveFrame = styled.div`
    position: relative;
`;

const ActionButton = styled.button`
    position: relative;
    width: 100%;
    border: 0;
    padding: 0;
    background: none;
    text-align: left;
    cursor: pointer;

    &:hover {
        filter: brightness(1.08);
    }

    &:disabled {
        cursor: default;
        filter: none;
    }
`;

const MarkerWrap = styled.span`
    position: absolute;
    top: ${({ theme }) => theme.spacing.xs};
    right: ${({ theme }) => theme.spacing.sm};
`;

const triggerAction = (
    action: CardDisplayAction,
    onAction?: CardDisplayActionHandler,
) => {
    if (action.disabled) return;
    if (action.callback) {
        action.callback();
        return;
    }
    onAction?.(action);
};

export const InteractiveFrame: React.FC<{
    action?: CardDisplayAction;
    className?: string;
    onAction?: CardDisplayActionHandler;
    children: React.ReactNode;
}> = ({ action, className, onAction, children }) => {
    if (!action) {
        return <PassiveFrame className={className}>{children}</PassiveFrame>;
    }

    return (
        <ActionButton
            type="button"
            className={className}
            aria-label={action.label}
            disabled={action.disabled}
            onClick={() => triggerAction(action, onAction)}
        >
            <MarkerWrap>
                <InfoAffordance />
            </MarkerWrap>
            {children}
        </ActionButton>
    );
};
