import styled from "@emotion/styled";

export const OverlayRoot = styled.div`
    position: fixed;
    top: ${({ theme }) => theme.spacing.lg};
    right: ${({ theme }) => theme.spacing.lg};
    width: 380px;
    max-height: 80vh;
    overflow-y: auto;
    overflow-x: hidden;
    z-index: ${({ theme }) => theme.zIndices.float};
    pointer-events: auto;
    color: ${({ theme }) => theme.colors.text};
`;

export const OverlayTitle = styled.div`
    font-size: ${({ theme }) => theme.fontSize.md};
    font-weight: 600;
    margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

export const OverlayMeta = styled.div`
    font-size: ${({ theme }) => theme.fontSize.xs};
    color: ${({ theme }) => theme.colors.secondary};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

export const OverlayActions = styled.div`
    display: flex;
    gap: ${({ theme }) => theme.spacing.xs};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

export const OverlayButton = styled.button`
    border: 1px solid ${({ theme }) => theme.colors.whiteBorderSubtle};
    background: ${({ theme }) => theme.colors.surfaceHighlight};
    color: ${({ theme }) => theme.colors.text};
    padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
    border-radius: ${({ theme }) => theme.radius.sm};
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: ${({ theme }) => theme.fontSize.xs};
    cursor: pointer;

    &:hover {
        background: ${({ theme }) => theme.colors.surface};
    }
`;

export const OverlayState = styled.pre`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: ${({ theme }) => theme.fontSize.xs};
    white-space: pre-wrap;
    word-break: break-word;
    color: ${({ theme }) => theme.colors.secondary};
`;

