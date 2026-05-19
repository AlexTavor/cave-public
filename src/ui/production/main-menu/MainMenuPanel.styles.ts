import styled from "@emotion/styled";
import { Button } from "../../lib/atoms/button";

export const PanelWrap = styled.div`
    display: grid;
    place-items: center;
    min-height: 100%;
    padding: ${({ theme }) => theme.spacing.xl};
    position: relative;
`;

export const PanelCard = styled.div`
    width: min(560px, 100%);
    display: grid;
    gap: ${({ theme }) => theme.spacing.md};
`;

export const PanelTitle = styled.h1`
    margin: 0;
    text-align: center;
    color: ${({ theme }) => theme.colors.primary};
    height: 4ch;
    font-size: 4.5rem;
`;

export const PanelSubtitle = styled.h2`
    margin: 0;
    text-align: center;
    color: ${({ theme }) => theme.colors.xp};
    height: 3.5ch;
`;

export const PanelText = styled.p`
    margin: 0;
    text-align: center;
    color: ${({ theme }) => theme.colors.secondary};
`;

export const ActionStack = styled.div`
    display: grid;
    gap: ${({ theme }) => theme.spacing.md};
`;

export const ToggleStack = styled.div`
    position: fixed;
    right: ${({ theme }) => theme.spacing.lg};
    bottom: ${({ theme }) => theme.spacing.lg};
    display: grid;
    gap: ${({ theme }) => theme.spacing.xs};
`;

export const ToggleRow = styled.label`
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
    color: ${({ theme }) => theme.colors.secondary};
    font-size: ${({ theme }) => theme.fontSize.sm};
    user-select: none;
`;

export const ToggleButton = styled(Button)`
    justify-content: center;
`;
