import type React from "react";

export interface FillBarThreshold {
    value: number;
    color?: string;
    label?: string;
}

export interface FillBarProps {
    current: number;
    max: number;
    color?: string;
    height?: string | number;
    thresholds?: FillBarThreshold[];
    className?: string;
    fillRef?: React.Ref<HTMLDivElement>;
    icon?: string;
    title?: React.ReactNode;
    showValue?: boolean;
    formatValue?: (current: number, max: number) => React.ReactNode;
}
