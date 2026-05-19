import styled from "@emotion/styled";
import { Card } from "../../lib/atoms/card";

const StatusShell = styled.div`
    position: absolute;
    bottom: 16px;
    z-index: ${({ theme }) => theme.zIndices.float};
`;

export const StatusShellLeft = styled(StatusShell)`
    left: 16px;
`;

export const LeftHudStack = styled.div`
    position: absolute;
    left: 16px;
    bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
    align-items: flex-start;
    z-index: ${({ theme }) => theme.zIndices.float};
    pointer-events: none;
`;

export const StatusShellRight = styled(StatusShell)`
    right: 16px;
`;

export const StatusStrip = styled(Card)`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const StatusReadout = styled.span`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: ${({ theme }) => theme.fontSize.md};
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
`;
