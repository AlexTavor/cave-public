import React, { useMemo } from "react";
import { CircularProgressProps } from "./types";
import {
    SvgContainer,
    BackgroundCircle,
    ProgressCircle,
} from "./CircularProgress.styles";

export const CircularProgress: React.FC<CircularProgressProps> = ({
    progress,
    size,
    strokeWidth,
    className,
}) => {
    // Default stroke width to 10% of size
    const stroke = strokeWidth ?? size * 0.1;

    // Calculate the radius (accounting for stroke width to prevent clipping)
    const radius = (size - stroke) / 2;
    const center = size / 2;

    // Calculate circle circumference
    const circumference = 2 * Math.PI * radius;

    // Clamp progress between 0 and 1
    const clampedProgress = Math.min(1, Math.max(0, progress));

    // Calculate dash offset (inverse because we're drawing clockwise)
    const dashOffset = useMemo(
        () => circumference * (1 - clampedProgress),
        [circumference, clampedProgress],
    );

    return (
        <SvgContainer
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className={className}
        >
            {/* Background circle */}
            <BackgroundCircle
                cx={center}
                cy={center}
                r={radius}
                strokeWidth={stroke}
            />

            {/* Progress circle */}
            <ProgressCircle
                cx={center}
                cy={center}
                r={radius}
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                progress={clampedProgress}
            />
        </SvgContainer>
    );
};
