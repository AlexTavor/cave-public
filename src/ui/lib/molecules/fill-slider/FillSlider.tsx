import React, { useState } from "react";
import { useTheme } from "@emotion/react";
import { GameIcon } from "../../atoms/game-icon/GameIcon";
import {
    clampFillValue,
    resolveFillHeight,
    resolveFillPercent,
} from "../../atoms/fill-bar/fillBarMath";
import {
    FillBarBackground,
    FillBarFill,
    FillBarHeading,
    FillBarMeta,
    FillBarShell,
    FillBarTrack,
    FillBarValue,
} from "../../atoms/fill-bar/FillBar.styles";
import {
    FillSliderFrame,
    FillSliderHandle,
    FillSliderInput,
    FillSliderTrackWrap,
} from "./FillSlider.styles";

type FillSliderProps = {
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
    icon?: string;
    title?: React.ReactNode;
    showValue?: boolean;
    formatValue?: (value: number, max: number) => React.ReactNode;
};

export const FillSlider: React.FC<FillSliderProps> = ({
    value,
    min,
    max,
    step = 1,
    onChange,
    icon,
    title,
    showValue = true,
    formatValue,
}) => {
    const theme = useTheme();
    const [dragging, setDragging] = useState(false);
    const range = Math.max(max - min, 1);
    const current = clampFillValue(value, min, max);
    const percent = resolveFillPercent(current - min, range);
    const shouldPulse = title === "Throttle" && current <= min;

    return (
        <FillSliderFrame
            dragging={dragging}
            shouldPulse={shouldPulse}
            data-dragging={dragging}
            data-pulse={shouldPulse}
        >
            <FillBarShell data-throttle-pulse={shouldPulse}>
                {(icon || title || showValue) && (
                    <FillBarMeta>
                        <FillBarHeading data-throttle-pulse={shouldPulse}>
                            {icon ? <GameIcon id={icon} size="sm" /> : null}
                            {title}
                        </FillBarHeading>
                        {showValue && (
                            <FillBarValue>
                                {formatValue
                                    ? formatValue(current, max)
                                    : `${current} / ${max}`}
                            </FillBarValue>
                        )}
                    </FillBarMeta>
                )}
                <FillSliderTrackWrap data-throttle-pulse={shouldPulse}>
                    <FillBarTrack height={resolveFillHeight(10)}>
                        <FillBarBackground data-throttle-pulse={shouldPulse} />
                        <FillBarFill
                            color={theme.colors.xp}
                            progress={percent}
                        />
                        <FillSliderHandle percent={percent} />
                    </FillBarTrack>
                    <FillSliderInput
                        aria-label={
                            typeof title === "string" ? title : "Fill slider"
                        }
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={current}
                        onChange={(event) =>
                            onChange(Number(event.currentTarget.value))
                        }
                        onBlur={() => setDragging(false)}
                        onMouseDown={() => setDragging(true)}
                        onMouseUp={() => setDragging(false)}
                    />
                </FillSliderTrackWrap>
            </FillBarShell>
        </FillSliderFrame>
    );
};
