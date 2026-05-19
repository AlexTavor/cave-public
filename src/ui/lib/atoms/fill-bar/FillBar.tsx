import { forwardRef, useMemo } from "react";
import { useTheme } from "@emotion/react";
import { GameIcon } from "../game-icon/GameIcon";
import {
    clampFillValue,
    resolveFillHeight,
    resolveFillPercent,
} from "./fillBarMath";
import { FillBarProps } from "./types";
import {
    FillBarBackground,
    FillBarFill,
    FillBarHeading,
    FillBarMeta,
    FillBarShell,
    FillBarThresholdMark,
    FillBarTrack,
    FillBarValue,
} from "./FillBar.styles";

export const FillBar = forwardRef<HTMLDivElement, FillBarProps>(
    (
        {
            current,
            max,
            color,
            height,
            thresholds = [],
            className,
            fillRef,
            icon,
            title,
            showValue = false,
            formatValue,
        },
        ref,
    ) => {
        const theme = useTheme();
        const trackHeight = resolveFillHeight(height);
        const safeCurrent = clampFillValue(current, 0, Math.max(max, 0));
        const safeMax = Math.max(max, 1);
        const progress = resolveFillPercent(safeCurrent, safeMax);
        const marks = useMemo(
            () =>
                thresholds
                    .map((threshold) => ({
                        ...threshold,
                        position: resolveFillPercent(threshold.value, safeMax),
                    }))
                    .filter(
                        (threshold) =>
                            threshold.position > 0 && threshold.position < 100,
                    ),
            [thresholds, safeMax],
        );

        return (
            <FillBarShell ref={ref} className={className}>
                {(icon || title || showValue) && (
                    <FillBarMeta>
                        <FillBarHeading>
                            {icon ? <GameIcon id={icon} size="sm" /> : null}
                            {title}
                        </FillBarHeading>
                        {showValue && (
                            <FillBarValue>
                                {formatValue
                                    ? formatValue(safeCurrent, max)
                                    : `${safeCurrent} / ${max}`}
                            </FillBarValue>
                        )}
                    </FillBarMeta>
                )}
                <FillBarTrack height={trackHeight}>
                    <FillBarBackground />
                    <FillBarFill
                        ref={fillRef}
                        data-progress={progress}
                        progress={progress}
                        color={color ?? theme.colors.xp}
                    />
                    {marks.map((threshold, index) => (
                        <FillBarThresholdMark
                            key={`${threshold.value}-${index}`}
                            color={threshold.color}
                            position={threshold.position}
                            title={threshold.label}
                        />
                    ))}
                </FillBarTrack>
            </FillBarShell>
        );
    },
);

FillBar.displayName = "FillBar";
