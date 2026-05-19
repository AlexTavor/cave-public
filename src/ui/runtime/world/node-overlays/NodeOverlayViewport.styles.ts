import styled from "@emotion/styled";
import { Card } from "../../../lib/atoms/card";
import type { NodeCalloutAnchor } from "./guidanceCalloutLayoutPlacement";
import { formatProgressTransform } from "../entity-state-link/valueMath";

export const OverlayRoot = styled.div`
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: ${({ theme }) => theme.zIndices.foreground};
`;

export const OverlaySlot = styled.div<{
    $anchor?: NodeCalloutAnchor;
    $hidden: boolean;
    $x: number;
    $y: number;
}>`
    position: absolute;
    left: 0;
    top: 0;
    transform: ${({ $x, $y, $anchor }) =>
        `translate3d(${$x}px, ${$y}px, 0) translate(-50%, ${
            $anchor === "below" ? "0" : "-100%"
        })`};
    opacity: ${({ $hidden }) => ($hidden ? 0 : 1)};
`;

export const CardShell = styled(Card)`
    display: flex;
    gap: ${({ theme }) => theme.spacing.xs};
    align-items: center;
`;

export const LabelText = styled.div`
    font-size: ${({ theme }) => theme.fontSize.md};
    color: ${({ theme }) => theme.colors.secondary};
`;

export const ValueText = styled.div`
    font-size: ${({ theme }) => theme.fontSize.md};
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
    text-align: center;
`;

export const ProgressRow = styled.div`
    position: relative;
    height: 5px;
    margin-top: ${({ theme }) => theme.spacing.xs};
    border-radius: ${({ theme }) => theme.radius.sm};
    overflow: hidden;
    background: ${({ theme }) => theme.colors.surfaceHighlight};
`;

export const ProgressFill = styled.div<{
    $color?: string;
    $progress: number;
}>`
    height: 100%;
    width: 100%;
    transform: ${({ $progress }) => formatProgressTransform($progress)};
    transform-origin: left center;
    background: ${({ theme, $color }) => $color ?? theme.colors.xp};
`;
