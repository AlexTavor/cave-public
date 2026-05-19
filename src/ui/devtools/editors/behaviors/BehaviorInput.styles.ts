import styled from "@emotion/styled";

export const InputRow = styled.div`
    display: flex;
    gap: ${({ theme }) => theme.spacing.sm};
    align-items: center;
`;

export const InputContainer = styled.div`
    flex: 1;
    min-width: 0;
`;

export const HelperText = styled.div`
    font-size: 11px;
    color: ${({ theme }) => theme.colors.secondary};
    font-family: ${({ theme }) => theme.fonts.code};
    margin-top: ${({ theme }) => theme.spacing.xs};
`;

export const ErrorText = styled.div`
    font-size: 11px;
    color: ${({ theme }) => theme.colors.error};
    font-family: ${({ theme }) => theme.fonts.code};
    margin-top: ${({ theme }) => theme.spacing.xs};
`;
