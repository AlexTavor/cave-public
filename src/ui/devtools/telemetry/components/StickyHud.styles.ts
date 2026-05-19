import styled from "@emotion/styled";

export const HudGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: ${({ theme }) => theme.spacing.sm};
    padding: ${({ theme }) => theme.spacing.md};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.ui};
`;

export const HudItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
    padding: ${({ theme }) => theme.spacing.sm};
    background: ${({ theme }) => theme.colors.surface};
    border-radius: ${({ theme }) => theme.radius.sm};
`;

export const HudLabel = styled.span`
    font-size: 11px;
    color: ${({ theme }) => theme.colors.secondary};
`;

export const HudValue = styled.span`
    font-size: 14px;
    font-weight: 600;
`;

export const EmptyState = styled.div`
    padding: ${({ theme }) => theme.spacing.md};
    color: ${({ theme }) => theme.colors.secondary};
    font-style: italic;
`;
