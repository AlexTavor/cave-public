import React from "react";
import styled from "@emotion/styled";
import type { CapsuleSkin, SkinStyle } from "../cardDisplayTypes";
import { Theme } from "@emotion/react";
import { ThemeAlertGroup } from "../../../../../lib/foundation/theme/types";

const resolveSkin = (theme: Theme, skin: CapsuleSkin): SkinStyle | ThemeAlertGroup => {
    if (skin === "plain" || skin === "value") {
        return {
            border: "transparent",
            background: "transparent",
            color: theme.colors.text,
        };
    }
    if (skin === "modifier") {
        return {
            border: theme.colors.surfaceHighlight,
            background: "transparent",
            color: theme.colors.secondary,
        };
    }
    if (skin === "ownedHabitus") {
        return {
            border: theme.colors.whiteBorderSubtle,
            background: "transparent",
            color: theme.colors.secondary,
        };
    }
    if (skin === "unownedHabitus" || skin === "caveOwned") {
        return {
            border: theme.colors.xp,
            background: "transparent",
            color: theme.colors.xp,
        };
    }
    if (skin === "warning") return theme.colors.severity.warning;
    if (skin === "danger") return theme.colors.severity.danger;
    return theme.colors.severity.info;
};

const Frame = styled.div<{ skin: CapsuleSkin }>`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
    min-width: 0;
    padding: ${({ skin, theme }) =>
        skin === "plain" || skin === "value"
            ? "0"
            : `${theme.spacing.xs} ${theme.spacing.sm}`};
    border-radius: ${({ theme }) => theme.radius.pill};
    border: ${({ skin, theme }) => {
        const palette = resolveSkin(theme, skin);
        return `1px solid ${palette.border}`;
    }};
    background: ${({ skin, theme }) => {
        const palette = resolveSkin(theme, skin);
        return "bg" in palette ? palette.bg : palette.background;
    }};
    color: ${({ skin, theme }) => {
        const palette = resolveSkin(theme, skin);
        return "text" in palette ? palette.text : palette.color;
    }};
`;

export const CapsuleFrame: React.FC<{
    skin: CapsuleSkin;
    className?: string;
    children: React.ReactNode;
}> = ({ skin, className, children }) => (
    <Frame skin={skin} className={className}>
        {children}
    </Frame>
);
