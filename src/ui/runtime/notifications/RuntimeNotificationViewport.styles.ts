import styled from "@emotion/styled";
import type { RuntimeNotificationTone } from "./runtimeNotificationTypes";
import {
    resolveNotificationAnimationDuration,
    resolveNotificationAnimationName,
    toneColors,
} from "./runtimeNotificationToneStyles";

export const NotificationViewportLayer = styled.div`
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: ${({ theme }) => theme.zIndices.float};
`;

const NotificationAnchor = styled.div`
    position: absolute;
    left: 16px;
    pointer-events: none;
`;

export const NotificationBottomLeftAnchor = styled(NotificationAnchor)`
    bottom: 16px;
`;

export const NotificationTopLeftAnchor = styled(NotificationAnchor)`
    top: 16px;
`;

const NotificationBlockBase = styled.div`
    display: flex;
    gap: ${({ theme }) => theme.spacing.sm};
    align-items: flex-start;
`;

export const OngoingNotificationBlock = styled(NotificationBlockBase)`
    flex-direction: column-reverse;
`;

export const EventNotificationBlock = styled(NotificationBlockBase)`
    flex-direction: column;
`;

export const NotificationFrame = styled.div<{
    $tone: RuntimeNotificationTone;
    $clickable: boolean;
    $attention?: boolean;
}>`
    pointer-events: ${({ $clickable }) => ($clickable ? "auto" : "none")};
    cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
    border-radius: ${({ theme }) => theme.radius.md};
    box-shadow: 0 0 0 ${({ theme }) => theme.borderWidth.thin}
        ${({ theme, $tone }) => toneColors(theme, $tone).border};
    color: ${({ theme, $tone }) => toneColors(theme, $tone).text};
    text-shadow: 0 0 ${({ theme }) => theme.spacing.sm}
        ${({ theme, $tone }) => toneColors(theme, $tone).shadow};
    filter: drop-shadow(
        0 0 ${({ theme }) => theme.spacing.sm}
            ${({ theme, $tone }) => toneColors(theme, $tone).shadow}
    );
    animation: ${({ $tone, $attention }) =>
            resolveNotificationAnimationName($tone, $attention)}
        ${({ $tone, $attention }) =>
            resolveNotificationAnimationDuration($tone, $attention)}
        ease-in-out infinite;
`;

export const NotificationText = styled.span`
    display: inline-flex;
    gap: ${({ theme }) => theme.spacing.xs};
    align-items: baseline;
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: ${({ theme }) => theme.fontSize.md};
    font-weight: 600;
    color: inherit;
`;

export const NotificationWord = styled.span<{
    $colorKey?: "statusKeywordHungry" | "statusKeywordCold";
    $color?: string;
}>`
    color: ${({ theme, $colorKey, $color }) =>
        $color ?? ($colorKey ? theme.colors[$colorKey] : "inherit")};
`;
