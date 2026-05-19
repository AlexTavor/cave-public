import styled from "@emotion/styled";
import { Card } from "../../../lib/atoms/card";

export const SelectionCardRoot = styled(Card)`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
    border: ${({ theme, variant }) =>
        variant === "transparent"
            ? "none"
            : `1px solid ${theme.colors.whiteBorderSubtle}`};
`;

export const HealthContainer = styled.div`
    display: flex;
    gap: ${({ theme }) => theme.spacing.sm};
    align-items: center;
    justify-content: center;
`;

export const CardHeader = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

export const CardTitle = styled.div`
    font-size: ${({ theme }) => theme.fontSize.lg};
    font-weight: 600;
`;

export const CardSubtitle = styled.div`
    font-size: ${({ theme }) => theme.fontSize.md};
    color: ${({ theme }) => theme.colors.secondary};
`;

export const StatGroupTitle = styled.div`
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: ${({ theme }) => theme.colors.secondary};
    margin-top: ${({ theme }) => theme.spacing.xs};
`;

export const StatRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.spacing.md};
`;

export const StatValue = styled.span`
    font-size: ${({ theme }) => theme.fontSize.lg};
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
    min-width: 18px;
`;

export const RateValue = styled.span`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 10px;
    color: ${({ theme }) => theme.colors.severity.danger.text};
`;

export const StatGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: ${({ theme }) => theme.spacing.md};
`;

export const StatItem = styled.div`
    display: grid;
    grid-template-columns: auto 42px 42px;
    align-items: center;
    column-gap: 4px;
    justify-self: stretch;
`;

export const AttributeValue = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    width: 100%;
`;

export const MutedText = styled.span`
    font-size: ${({ theme }) => theme.fontSize.lg};
    color: ${({ theme }) => theme.colors.secondary};
`;

export const StatLabel = styled.span`
    font-size: ${({ theme }) => theme.fontSize.lg};
    color: ${({ theme }) => theme.colors.secondary};
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
`;

