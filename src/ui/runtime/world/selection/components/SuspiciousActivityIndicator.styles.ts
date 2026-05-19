import styled from "@emotion/styled";

export const SuspiciousPill = styled.div<{ color: string }>`
    display: inline-flex;
    align-items: center;
    width: fit-content;
    padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
    border-radius: ${({ theme }) => theme.radius.pill};
    border: 1px solid ${({ color }) => color};
    color: ${({ color }) => color};
    background: ${({ theme }) => theme.colors.surface};
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: ${({ theme }) => theme.fontSize.sm};
    font-weight: 600;
`;
