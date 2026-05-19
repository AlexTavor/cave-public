import styled from "@emotion/styled";

export const EditorWrap = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
`;

export const JsonTextarea = styled.textarea`
    flex: 1;
    resize: none;
    font-family: monospace;
    font-size: 13px;
    padding: ${({ theme }) => theme.spacing.sm};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    border: none;
    outline: none;
`;

export const ErrorLine = styled.div`
    color: ${({ theme }) => theme.colors.error};
    padding: ${({ theme }) => theme.spacing.xs}
        ${({ theme }) => theme.spacing.sm};
    font-size: 12px;
`;
