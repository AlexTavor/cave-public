import React from "react";
import styled from "@emotion/styled";
import { useBlueprintContext } from "../BlueprintContext";
import { useSessionStore } from "../../../state/useSessionStore";

const IdButton = styled.button`
    all: unset;
    cursor: pointer;
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover {
        text-decoration: underline;
        color: ${({ theme }) => theme.colors.primary};
    }
`;

export const BlueprintIdTitle: React.FC = () => {
    const { filename, blueprintId, scopeId } = useBlueprintContext();
    const updateSessionUi = useSessionStore((s) => s.updateSessionUi);

    const openChangeId = () => {
        updateSessionUi(filename, scopeId, (ui) => {
            ui.isChangeIdOpen = true;
        });
    };

    return (
        <IdButton onClick={openChangeId} title="Click to change ID">
            {blueprintId}
        </IdButton>
    );
};
