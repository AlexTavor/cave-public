import styled from "@emotion/styled";

export const AppRoot = styled.div`
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    pointer-events: none;
`;

export const RuntimeLayer = styled.div`
    pointer-events: all;
    position: absolute;
    inset: 0;
`;

export const AmbientLayer = styled.div`
    position: absolute;
    inset: 0;
    pointer-events: all;
`;

export const OverlayLayer = styled.div`
    position: absolute;
    inset: 0;
    pointer-events: none;
`;

export const InteractiveOverlay = styled.div`
    position: absolute;
    inset: 0;
    pointer-events: all;
`;

export const MenuButtonLayer = styled.div`
    position: absolute;
    inset: 0;
    pointer-events: none;
`;

