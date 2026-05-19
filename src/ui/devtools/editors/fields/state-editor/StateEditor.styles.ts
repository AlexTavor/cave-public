import styled from "@emotion/styled";
import { Input } from "../Shared.styles";

export const EditorContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const Header = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const FilterInput = styled(Input)`
    width: 100%;
`;

export const AddRow = styled.div`
    display: flex;
    gap: ${({ theme }) => theme.spacing.sm};
    align-items: center;
`;

export const AddInput = styled(Input)`
    flex: 1;
`;

export const Rows = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
`;

export const Row = styled.div`
    display: grid;
    grid-template-columns: 1fr 140px auto;
    gap: ${({ theme }) => theme.spacing.sm};
    align-items: center;
    padding: ${({ theme }) => theme.spacing.xs};
    border-radius: ${({ theme }) => theme.radius.sm};
    background: ${({ theme }) => theme.colors.surface};
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.whiteBorderSubtle}`};
`;

export const KeyText = styled.span`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const ValueInput = styled(Input)`
    text-align: right;
`;

export const EmptyState = styled.div`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
    padding: ${({ theme }) => theme.spacing.xs} 0;
`;
