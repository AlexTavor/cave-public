import styled from "@emotion/styled";

export const ShellRoot = styled.div`
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: ${({ theme }) => theme.colors.background};
`;

export const RuntimeViewport = styled.div`
    position: relative;
    flex: 1;
    overflow: hidden;
`;

export const GameCanvas = styled.div`
    position: absolute;
    inset: 0;
    z-index: 0;
`;
