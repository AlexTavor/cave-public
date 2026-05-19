export const typography = {
    crimson: "'Crimson Pro Variable', 'Crimson Pro', serif",
    inter: "'Inter Variable', 'Inter', sans-serif",
    courier: "'Courier New', Courier, monospace",
} as const;

export const zIndex = {
    base: 0,
    foreground: 20,
    modal: 20000,
    float: 2000,
    toast: 3000,
    cursor: 9999,
    tooltip: 30000,
    callout: 40000,
} as const;

export const spacing = {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
} as const;

export const borderRadius = {
    xs: "3px",
    sm: "3px",
    md: "5px",
    lg: "8px",
    xl: "8px",
    round: "50%",
    pill: "999px",
} as const;

// Font sizes
export const fontSize = {
    xs: "10px",
    sm: "12px",
    md: "16px",
    base: "18px",
    lg: "20px",
    xl: "24px",
    xxl: "32px",
} as const;

// Icon sizes
export const iconSize = {
    xs: "12px",
    sm: "16px",
    md: "20px",
    lg: "28px",
    xl: "40px",
} as const;

// Border widths
export const borderWidth = {
    thin: "1px",
    medium: "2px",
    thick: "3px",
} as const;

// Common dimensions
export const sizes = {
    statusDot: "8px",
    activityIconSm: "12px",
    activityIconMd: "24px",
    activityIconLg: "32px",
    fillbarHeight: {
        line: "4px",
        display: "6px",
        details: "6px",
    },
    bodyCardMin: "200px",
    bodyCardMax: "250px",
    buildingPanelWidth: "400px",
    buildingPanelHeight: "800px",
    buildingPanelMiddleHeight: "200px",
    portrait: {
        sm: "24px",
        md: "32px",
        lg: "48px",
        xl: "64px",
    },
} as const;

