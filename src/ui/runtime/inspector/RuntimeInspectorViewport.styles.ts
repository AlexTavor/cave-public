import styled from "@emotion/styled";

export const ViewportRoot = styled.div`
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: ${({ theme }) => theme.zIndices.float};
`;

export const WindowShell = styled.div<{
    $x: number;
    $y: number;
    $width: number;
    $height: number;
    $zIndex: number;
}>`
    position: absolute;
    left: ${({ $x }) => `${$x}px`};
    top: ${({ $y }) => `${$y}px`};
    width: ${({ $width }) => `${$width}px`};
    height: ${({ $height }) => `${$height}px`};
    z-index: ${({ $zIndex }) => $zIndex};
    pointer-events: auto;
    display: grid;
    grid-template-rows: auto 1fr;
    background: rgba(0, 0, 0, 0.88);
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.whiteBorderMedium}`};
    border-radius: ${({ theme }) => theme.radius.md};
    box-shadow: 0 12px 28px ${({ theme }) => theme.colors.blackShadow};
    color: ${({ theme }) => theme.colors.text};
    user-select: all;
`;

export const WindowHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.spacing.sm};
    padding: ${({ theme }) => theme.spacing.sm};
    background: ${({ theme }) => theme.colors.surfaceHighlight};
    cursor: move;
`;

export const WindowTitle = styled.div`
    min-width: 0;
    font-size: ${({ theme }) => theme.fontSize.sm};
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const WindowActions = styled.div`
    display: inline-flex;
    gap: ${({ theme }) => theme.spacing.xs};
`;

export const ActionButton = styled.button`
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.whiteBorderSubtle}`};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    font-size: ${({ theme }) => theme.fontSize.xs};
`;

export const ContentScroller = styled.div`
    overflow: auto;
    padding: ${({ theme }) => theme.spacing.sm};
`;

export const ContentBlock = styled.pre`
    margin: 0;
    white-space: pre-wrap;
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: ${({ theme }) => theme.fontSize.xs};
`;

export const ResizeHandle = styled.button`
    position: absolute;
    right: ${({ theme }) => theme.spacing.xs};
    bottom: ${({ theme }) => theme.spacing.xs};
    width: 14px;
    height: 14px;
    padding: 0;
    border-right: 2px solid ${({ theme }) => theme.colors.secondary};
    border-bottom: 2px solid ${({ theme }) => theme.colors.secondary};
    border-top: 0;
    border-left: 0;
    background: transparent;
    cursor: nwse-resize;
`;
