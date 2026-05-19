import { keyframes } from "@emotion/react";
import { TUTORIAL_NOTIFICATION_PUNCH_INTERVAL_MS } from "./constants";
import type { RuntimeNotificationTone } from "./runtimeNotificationTypes";

const purgePulse = keyframes`
    0%, 100% { transform: translateZ(0); }
    50% { transform: translateY(-1px); }
`;

const tutorialPunch = keyframes`
    0%, 86%, 100% { transform: scale(1); }
    90% { transform: scale(1.15); }
    94% { transform: scale(0.98); }
    97% { transform: scale(1.2); }
`;

export const resolveNotificationAnimationDuration = (
    tone: RuntimeNotificationTone,
    attention?: boolean,
) => {
    if (attention) return `${TUTORIAL_NOTIFICATION_PUNCH_INTERVAL_MS}ms`;
    return tone === "purge" ? "1300ms" : "0ms";
};

export const resolveNotificationAnimationName = (
    tone: RuntimeNotificationTone,
    attention?: boolean,
) => {
    if (attention) return tutorialPunch;
    return tone === "purge" ? purgePulse : "none";
};

export const toneColors = (theme: any, tone: RuntimeNotificationTone) => {
    if (tone === "info") return theme.colors.severity.info;
    if (tone === "warning") return theme.colors.severity.warning;
    if (tone === "danger") return theme.colors.severity.danger;
    if (tone === "purge") return theme.colors.purgeAlarm;
    return {
        border: theme.colors.whiteBorderMedium,
        text: theme.colors.text,
        shadow: theme.colors.blackShadow,
    };
};
