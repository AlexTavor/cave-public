import styled from "@emotion/styled";
import { motion } from "framer-motion";

export const CINEMATIC_FADE_DURATION = 600;
export const EARLY_OUT = 0;

export const CinematicContainer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: all;
    z-index: ${({ theme }) => theme.zIndices.tooltip + 100};
    cursor: pointer;
`;

export const BlackOverlay = styled.div<{ $visible: boolean }>`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: ${({ theme }) => theme.colors.background};
    opacity: ${({ $visible }) => ($visible ? 1 : 0)};
    transition: opacity ${CINEMATIC_FADE_DURATION}ms ease-in-out;
    pointer-events: none;
`;

export const CinematicText = styled(motion.div)`
    position: relative;
    width: 80%;
    max-width: 800px;
    text-align: center;
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: ${({ theme }) => theme.fontSize.xxl};
    color: ${({ theme }) => theme.colors.xp};
    line-height: 1.6;
    padding: ${({ theme }) => theme.spacing.xl};
    z-index: 1;
`;
