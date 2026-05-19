import styled from "@emotion/styled";

export const DashboardRoot = styled.div`
    display: grid;
    grid-template-columns: minmax(280px, 1fr) 2fr;
    gap: ${({ theme }) => theme.spacing.lg};
    height: 100%;
    padding: ${({ theme }) => theme.spacing.lg};
    color: ${({ theme }) => theme.colors.text};
    overflow: hidden;
    background: ${({ theme }) => theme.colors.background};
`;

export const PanelCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
    background: ${({ theme }) => theme.colors.surface};
    border-radius: ${({ theme }) => theme.radius.md};
    padding: ${({ theme }) => theme.spacing.md};
    border: 1px solid ${({ theme }) => theme.colors.surfaceHighlight};
    height: 100%;
    min-height: 0;
    overflow: hidden;
`;

export const PanelHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const PanelTitle = styled.div`
    font-size: ${({ theme }) => theme.fontSize.lg};
    font-weight: 600;
`;

export const PanelHint = styled.div`
    font-size: ${({ theme }) => theme.fontSize.sm};
    color: ${({ theme }) => theme.colors.secondary};
`;

export const PanelActions = styled.div`
    display: flex;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const PanelContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
    flex: 1;
    min-height: 0;
`;

export const EmptyState = styled.div`
    padding: ${({ theme }) => theme.spacing.lg};
    color: ${({ theme }) => theme.colors.secondary};
`;
