import styled from "@emotion/styled";

export const FieldContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 12px;
    border-left: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.whiteBorderSubtle}`};
    padding-left: 12px;
`;

export const Label = styled.label`
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
    font-family: monospace;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

export const Input = styled.input`
    background: ${({ theme }) => theme.colors.surface};
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.whiteBorderSubtle}`};
    color: ${({ theme }) => theme.colors.text};
    padding: 6px;
    font-family: monospace;
    font-size: 13px;
    border-radius: 4px;

    &:focus {
        border-color: ${({ theme }) => theme.colors.primary};
        outline: none;
    }
`;

export const TextArea = styled.textarea`
    background: ${({ theme }) => theme.colors.surface};
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.whiteBorderSubtle}`};
    color: ${({ theme }) => theme.colors.text};
    padding: 6px;
    font-family: monospace;
    font-size: 13px;
    border-radius: 4px;
    min-height: 60px;
    resize: vertical;

    &:focus {
        border-color: ${({ theme }) => theme.colors.primary};
        outline: none;
    }
`;

export const Select = styled.select`
    background: ${({ theme }) => theme.colors.surface};
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.whiteBorderSubtle}`};
    color: ${({ theme }) => theme.colors.text};
    padding: 6px;
    font-family: monospace;
    font-size: 13px;
    border-radius: 4px;

    &:focus {
        border-color: ${({ theme }) => theme.colors.primary};
        outline: none;
    }
`;
