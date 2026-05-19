import styled from "@emotion/styled";
import { Select } from "../editors/fields/Shared.styles";

export const SetupRoot = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
    padding-bottom: ${({ theme }) => theme.spacing.md};
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceHighlight};
`;

export const SetupTitle = styled.div`
    font-size: ${({ theme }) => theme.fontSize.xs};
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.secondary};
`;

export const SetupRow = styled.div`
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: ${({ theme }) => theme.spacing.sm};
    align-items: center;
`;

export const SetupSelect = styled(Select)`
    width: 100%;
`;
