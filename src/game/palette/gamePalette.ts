export const GAME_PALETTE = {
    surfaces: {
        background: "rgba(0, 0, 0, 1)",
        panel: "#2d2d2d",
        panelHighlight: "#444444",
        modal: "rgba(0, 0, 0, 0.7)",
        scrollbarThumb: "#595959ff",
        scrollbarThumbHover: "#bbbbbb",
    },
    text: { primary: "#FFFFFF", secondary: "#bbbbbb" },
    interactive: {
        primary: "#8888ff",
        selected: "#2196F3",
        disabled: "#555555",
        danger: "#f44336",
        success: "#4caf50",
        buttonDefault: "#228B22",
        buttonSelected: "#C69200",
    },
    mechanics: {
        stamina: "#4caf50",
        xp: "#ff9800",
        activity: "#8888ff",
        understanding: "#2196F3",
        heat: "#ff9800",
        food: "#f443364d",
        goal: "#C69200",
    },
    severity: {
        info: {
            bg: "rgba(33, 150, 243, 0.15)",
            border: "rgba(33, 150, 243, 0.4)",
            text: "#64B5F6",
            shadow: "rgba(33, 150, 243, 0.3)",
        },
        warning: {
            bg: "rgba(255, 152, 0, 0.15)",
            border: "rgba(255, 152, 0, 0.4)",
            text: "#FFB74D",
            shadow: "rgba(255, 152, 0, 0.3)",
        },
        danger: {
            bg: "rgba(244, 67, 54, 0.15)",
            border: "rgba(244, 67, 54, 0.4)",
            text: "#EF5350",
            shadow: "rgba(244, 67, 54, 0.3)",
        },
    },
    statusKeywords: { hungry: "rgba(244, 67, 54, 0.3)", cold: "#64B5F6" },
    purgeAlarm: {
        bg: "rgba(244, 67, 54, 0.15)",
        border: "rgba(244, 67, 54, 0.4)",
        text: "#EF5350",
        shadow: "rgba(244, 67, 54, 0.3)",
    },
    chrome: {
        whiteBorderSubtle: "rgba(255, 255, 255, 0.1)",
        whiteBorderMedium: "rgba(255, 255, 255, 0.3)",
        blackShadow: "rgba(0, 0, 0, 0.5)",
    },
} as const;

export type GamePalette = typeof GAME_PALETTE;
