export type ThemeAlertGroup = {
    bg: string;
    border: string;
    text: string;
    shadow: string;
};

type ThemeScale = Record<"xs" | "sm" | "md" | "lg" | "xl", string>;

export interface ThemeColors {
    background: string;
    surface: string;
    surfaceHighlight: string;   
    modal: string;
    text: string;
    secondary: string;
    primary: string;
    selected: string;
    disabled: string;
    danger: string;
    success: string;
    error: string;
    buttonDefault: string;
    buttonSelected: string;
    stamina: string;
    xp: string;
    activity: string;
    understanding: string;
    heat: string;
    food: string;
    goal: string;
    severity: {
        info: ThemeAlertGroup;
        warning: ThemeAlertGroup;
        danger: ThemeAlertGroup;
    };
    purgeAlarm: ThemeAlertGroup;
    statusKeywordHungry: string;
    statusKeywordCold: string;
    scrollbarThumb: string;
    scrollbarThumbHover: string;
    whiteBorderSubtle: string;
    whiteBorderMedium: string;
    blackShadow: string;
}

export interface AppTheme {
    colors: ThemeColors;
    fonts: {
        observer: string;
        scientist: string;
        ui: string;
        code: string;
    };
    zIndices: {
        base: number;
        foreground: number;
        modal: number;
        float: number;
        toast: number;
        tooltip: number;
        callout: number;
    };
    spacing: ThemeScale;
    radius: ThemeScale & Record<"round" | "pill", string>;
    fontSize: ThemeScale & Record<"base" | "xxl", string>;
    iconSize: ThemeScale;
    borderWidth: {
        thin: string;
        medium: string;
        thick: string;
    };
    sizes: {
        buildingPanelMiddleHeight: string;
        buildingPanelWidth: string;
        statusDot: string;
        activityIconSm: string;
        activityIconMd: string;
        activityIconLg: string;
        fillbarHeight: {
            line: string;
            display: string;
            details: string;
        };
        bodyCardMin: string;
        bodyCardMax: string;
        portrait: {
            sm: string;
            md: string;
            lg: string;
            xl: string;
        };
    };
}

