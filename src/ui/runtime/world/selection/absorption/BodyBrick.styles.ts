import styled from "@emotion/styled";
import { GameIcon } from "../../../../lib/atoms/game-icon";

export const Brick = styled.div<{
    selected: boolean;
    showSelectionIndicators: boolean;
}>`
    --brick-glow-opacity: ${({ selected }) => (selected ? 0.6 : 0.42)};
    --brick-glow-scale: ${({ selected }) => (selected ? 1.01 : 1)};
    min-height: ${({ theme }) => theme.spacing.xl};
    padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
    display: grid;
    grid-template-columns: ${({ showSelectionIndicators }) =>
        showSelectionIndicators
            ? "auto auto auto auto auto 1fr auto"
            : "auto auto auto auto 1fr"};
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
    position: relative;

    &:hover {
        --brick-glow-opacity: ${({ selected }) => (selected ? 0.8 : 0.64)};
        --brick-glow-scale: 1.02;
    }
`;

export const BrickBackground = styled.div<{ selected: boolean }>`
    position: absolute;
    top: -${({ theme }) => theme.spacing.xs};
    left: -${({ theme }) => theme.spacing.xs};
    right: -${({ theme }) => theme.spacing.xs};
    bottom: -${({ theme }) => theme.spacing.xs};
    border-radius: ${({ theme }) => theme.radius.md};
    pointer-events: none;
    opacity: var(--brick-glow-opacity);
    transform: scale(var(--brick-glow-scale));
    transition:
        opacity 0.2s ease,
        transform 0.2s ease;
    background: ${({ theme }) =>
        `radial-gradient(ellipse at center, ${theme.colors.surfaceHighlight} 0%, transparent 70%)`};
`;

export const SelectionIndicator = styled(GameIcon)<{ selected: boolean }>`
    opacity: ${({ selected }) => (selected ? 1 : 0)};
    transition: opacity 0.3s;
`;

export const AvatarSlot = styled.div<{ selected: boolean }>`
    display: flex;
    align-items: center;
    opacity: ${({ selected }) => (selected ? 1 : 0.72)};
    transition: opacity 0.2s ease;
`;

export const MetricItem = styled.div`
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.xs};
    white-space: nowrap;
`;

export const MetricValue = styled.span`
    font-size: ${({ theme }) => theme.fontSize.base};
    font-weight: 600;
`;

export const AttributeRow = styled.div`
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const StatusSlot = styled.div`
    display: flex;
    justify-content: flex-end;
    min-width: 0;
`;

