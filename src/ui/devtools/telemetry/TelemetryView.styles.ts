import styled from "@emotion/styled";

export const TelemetryRoot = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    pointer-events: auto;
    background: ${({ theme }) => theme.colors.background};
`;

export const MessageContainer = styled.div`
    padding: ${({ theme }) => theme.spacing.md};
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 16px;
`;

export const PanelBody = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    user-select: text;
`;

export const TabsRow = styled.div`
    display: flex;
    gap: ${({ theme }) => theme.spacing.xs};
    padding: ${({ theme }) => theme.spacing.sm};
    border-bottom: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.surfaceHighlight}`};
    background: ${({ theme }) => theme.colors.background};
`;

export const TabButton = styled.button<{ isActive: boolean }>`
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.surfaceHighlight}`};
    background: ${({ theme, isActive }) =>
        isActive ? theme.colors.surfaceHighlight : theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
    border-radius: ${({ theme }) => theme.radius.sm};
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 12px;
    cursor: pointer;

    &:hover {
        background: ${({ theme }) => theme.colors.surfaceHighlight};
    }
`;

export const ContentArea = styled.div`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
`;
