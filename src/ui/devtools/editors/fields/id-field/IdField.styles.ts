import styled from "@emotion/styled";

export const ErrorText = styled.span`
    color: ${({ theme }) => theme.colors.error};
    font-size: 11px;
    margin-left: auto;
    font-weight: bold;
`;

export const InputWrapper = styled.div<{ hasError: boolean }>`
    position: relative;

    input {
        width: 100%;
        border-color: ${({ hasError, theme }) =>
            hasError ? theme.colors.error : theme.colors.surfaceHighlight};

        &:focus {
            border-color: ${({ hasError, theme }) =>
                hasError ? theme.colors.error : theme.colors.primary};
        }
    }
`;
