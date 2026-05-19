import styled from "@emotion/styled";

export const Grid = styled.div`
    padding: 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-content: flex-start;
`;

export const List = styled.div`
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const ListRow = styled.div`
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
    cursor: pointer;

    &:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.14);
    }
`;

export const ListPrimary = styled.div`
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text};
    font-weight: 600;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const ListSecondary = styled.div`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 11px;
    color: ${({ theme }) => theme.colors.secondary};
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const ItemLabel = styled.div`
    margin-top: 8px;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
    text-align: center;
    max-width: 100px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: ${({ theme }) => theme.fonts.ui};
`;

export const ToolbarInput = styled.input`
    height: 28px;
    padding: 0 10px;
    border-radius: 10px;
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.whiteBorderSubtle}`};
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
    outline: none;

    &:focus {
        border-color: ${({ theme }) => theme.colors.whiteBorderMedium};
    }
`;

export const DashboardGrid = styled.div`
    padding: ${({ theme }) => theme.spacing.lg};
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: ${({ theme }) => theme.spacing.md};
    align-content: start;
`;

export const DashboardCard = styled.button`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: ${({ theme }) => theme.spacing.xs};
    padding: ${({ theme }) => theme.spacing.md};
    border-radius: ${({ theme }) => theme.radius.md};
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.surfaceHighlight}`};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    text-align: left;
    cursor: pointer;
    transition:
        border-color 0.15s ease,
        background 0.15s ease;

    &:hover {
        border-color: ${({ theme }) => theme.colors.whiteBorderMedium};
        background: ${({ theme }) => theme.colors.surfaceHighlight};
    }
`;

export const DashboardIcon = styled.div`
    font-size: 20px;
`;

export const DashboardTitle = styled.div`
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 13px;
    font-weight: 700;
`;

export const DashboardSubtitle = styled.div`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 11px;
    color: ${({ theme }) => theme.colors.secondary};
`;
