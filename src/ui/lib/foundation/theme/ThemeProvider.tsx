import React from "react";
import {
    ThemeProvider as EmotionThemeProvider,
    Global,
    css,
} from "@emotion/react";
import { defaultTheme } from "./defaultTheme";

const globalStyles = (theme: typeof defaultTheme) => css`
    body {
        background-color: ${theme.colors.background};
        color: ${theme.colors.text};
        font-family: ${theme.fonts.ui};
        margin: 0;
        padding: 0;
        overflow: hidden; /* Prevent scroll on game */
        user-select: none;
    }

    /* Custom scrollbar styling to match game aesthetic */
    *::-webkit-scrollbar {
        width: ${theme.spacing.sm};
    }
    *::-webkit-scrollbar-track {
        background: ${theme.colors.surface};
    }
    *::-webkit-scrollbar-thumb {
        background: ${theme.colors.scrollbarThumb};
        border-radius: ${theme.radius.sm};
    }
    *::-webkit-scrollbar-thumb:hover {
        background: ${theme.colors.scrollbarThumbHover};
    }
`;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    return (
        <EmotionThemeProvider theme={defaultTheme}>
            <Global styles={globalStyles} />
            {children}
        </EmotionThemeProvider>
    );
};

