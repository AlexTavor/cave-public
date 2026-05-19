import styled from "@emotion/styled";
import { Button } from "../../lib/atoms/button";

export const CardRoot = styled(Button)`
    display: grid;
    gap: ${({ theme }) => theme.spacing.sm};
    max-width: 400px;
`;

export const CardTop = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: ${({ theme }) => theme.spacing.sm};
    align-items: start;
`;

export const CardHeader = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const CardTitle = styled.div`
    font-size: ${({ theme }) => theme.fontSize.lg};
    font-weight: 600;
`;

export const RarityText = styled.span`
    font-size: ${({ theme }) => theme.fontSize.xs};
    color: ${({ theme }) => theme.colors.secondary};
`;

export const IconWrap = styled.div`
    display: flex;
    justify-content: center;
`;

export const IconRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.spacing.xs};
    justify-content: center;
`;

export const CardBody = styled.div`
    display: grid;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const ActionRow = styled.div`
    display: flex;
    justify-content: flex-end;
`;

