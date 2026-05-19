import type React from "react";
import type { FillBarThreshold } from "../fill-bar/types";

export type ProgressBarThreshold = FillBarThreshold;

export interface ProgressBarProps {
    /** Current value */
    current: number;
    /** Maximum value (defines 100% width) */
    max: number;
    /** Fill color of the bar */
    color?: string;
    /** Height of the bar in pixels or CSS string. Default: '8px' */
    height?: string | number;
    /** Array of threshold values to mark with ticks */
    thresholds?: ProgressBarThreshold[];
    /** Optional CSS class */
    className?: string;
    /** If true, shows the current/max text over the bar */
    showText?: boolean;
    /** Custom formatter for the text if showText is true */
    formatText?: (current: number, max: number) => React.ReactNode;
    /** Ref to the internal fill element for direct DOM updates */
    fillRef?: React.Ref<HTMLDivElement>;
}

