import styled from "@emotion/styled";
import { Card } from "../../../../lib/atoms/card";

export const SelectorContainer = styled(Card)`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
    min-width: 520px;
`;

export const GainsDisplay = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
    border: 0px;
    min-height: 120px;
`;

export const SelectorHeader = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const SelectorListFrame = styled.div`
    height: ${({ theme }) => theme.sizes.bodyCardMax};
    min-height: 220px;
    padding: ${({ theme }) => theme.spacing.sm};
    box-sizing: border-box;
    border-radius: ${({ theme }) => theme.radius.md};
    overflow: hidden;
`;

export const SelectorRow = styled.div`
    padding-bottom: ${({ theme }) => theme.spacing.xs};
`;

export const SummaryRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
    font-size: ${({ theme }) => theme.fontSize.lg};
`;

export const PreviewBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
    padding: ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.radius.md};
`;

export const SelectorFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: ${({ theme }) => theme.spacing.sm};
`;

