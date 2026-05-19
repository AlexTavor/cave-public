import { forwardRef } from "react";
import { FillBar } from "../fill-bar/FillBar";
import { ProgressBarProps } from "./types";

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
    (
        {
            current,
            max,
            color,
            height = "16px",
            thresholds = [],
            className,
            showText = false,
            formatText,
            fillRef,
        },
        ref,
    ) => (
        <FillBar
            ref={ref}
            current={current}
            max={max}
            color={color}
            height={height}
            thresholds={thresholds}
            className={className}
            fillRef={fillRef}
            showValue={showText}
            formatValue={formatText}
        />
    ),
);

ProgressBar.displayName = "ProgressBar";

