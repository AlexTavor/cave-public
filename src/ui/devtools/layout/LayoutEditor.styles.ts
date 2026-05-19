import styled from "@emotion/styled";

export const OverlayRoot = styled.div`
    pointer-events: all;
    position: fixed;
    inset: 0;
    background: ${({ theme }) => theme.colors.background};
    display: flex;
    align-items: stretch;
    z-index: 1000;
`;

export const StageChrome = styled.div`
    flex: 1;
    overflow: hidden;
    position: relative;
`;

export const LayoutViewport = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    background: ${({ theme }) => theme.colors.background};
    overflow: hidden;
`;

export const CanvasAnchor = styled.div`
    position: absolute;
    inset: 0;
    z-index: 0;
`;

export const LoadingState = styled.div`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.secondary};
    background: rgba(2, 4, 12, 0.82);
    z-index: 4;
`;

