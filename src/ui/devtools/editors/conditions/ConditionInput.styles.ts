import styled from "@emotion/styled";

export const InputRow = styled.div`
    display: flex;
    gap: ${({ theme }) => theme.spacing.sm};
    align-items: center;
    width: 100%;
`;

export const InputContainer = styled.div`
    flex: 1;
    min-width: 0;
    width: 100%;
`;

export const ErrorText = styled.div`
    font-size: 11px;
    color: ${({ theme }) => theme.colors.error};
    font-family: ${({ theme }) => theme.fonts.code};
    margin-top: ${({ theme }) => theme.spacing.xs};
`;
