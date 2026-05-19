import styled from "@emotion/styled";
import { Card } from "../../lib/atoms/card";

export const OverlayContent = styled(Card)`
    width: min(900px, 90vw);
`;

export const OverlayTitle = styled.h2`
    font-size: ${({ theme }) => theme.fontSize.xl};
    font-weight: 600;
    margin: 0;
`;

export const OverlayStack = styled.div`
    display: grid;
    gap: ${({ theme }) => theme.spacing.xl};
`;

export const NarrativeTitle = styled.h3`
    margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
    font-size: ${({ theme }) => theme.fontSize.base};
`;

export const CardGrid = styled.div`
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: ${({ theme }) => theme.spacing.md};
`;

