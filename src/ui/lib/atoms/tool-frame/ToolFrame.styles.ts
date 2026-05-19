import styled from "@emotion/styled";

export const Frame = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    background: ${({ theme }) => theme.colors.surface};
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.surfaceHighlight}`};
    border-radius: ${({ theme }) => theme.radius.md};
    overflow: hidden;
`;

export const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.spacing.sm};
    padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
    background: ${({ theme }) => theme.colors.background};
    border-bottom: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.surfaceHighlight}`};
`;

export const TitleCluster = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
    min-width: 0;
`;

export const Title = styled.div`
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const Actions = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const Body = styled.div`
    flex: 1;
    overflow-y: auto;

    /* Subtle custom scrollbar */
    &::-webkit-scrollbar {
        width: 10px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        border: 2px solid transparent;
        background-clip: padding-box;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.18);
        border: 2px solid transparent;
        background-clip: padding-box;
    }
`;
