import styled from "@emotion/styled";

export const AddRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
    margin-top: ${({ theme }) => theme.spacing.md};
`;

export const InputContainer = styled.div`
    flex: 1;
    min-width: 0;
`;

export const ErrorText = styled.div`
    margin-top: ${({ theme }) => theme.spacing.xs};
    font-size: 11px;
    color: ${({ theme }) => theme.colors.error};
    font-family: ${({ theme }) => theme.fonts.code};
`;
