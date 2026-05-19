import styled from "@emotion/styled";

export const FallbackContainer = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${({ theme }) => theme.spacing.sm};
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    padding: ${({ theme }) => theme.spacing.lg};
`;

export const FallbackTitle = styled.div`
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 16px;
    font-weight: 700;
`;

export const FallbackMessage = styled.div`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
    text-align: center;
`;
