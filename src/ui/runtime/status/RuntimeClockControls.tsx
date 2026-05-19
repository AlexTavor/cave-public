import type React from "react";
import { Button } from "../../lib/atoms/button";
import { ClockControls as ClockControlsGroup } from "./RuntimeClock.styles";
import { useRuntimeClockControls } from "./useRuntimeClock";

const SCALE_OPTIONS = [1, 3, 5];

export const RuntimeClockControls: React.FC = () => {
    const { status, timeScale, togglePlayback, handleScaleToggle } =
        useRuntimeClockControls();
    const playbackLabel = status === "running" ? "Pause" : "Play";

    return (
        <>
            <Button
                size="sm"
                variant={status === "running" ? "primary" : "danger"}
                isSelected
                onClick={togglePlayback}
                aria-label={playbackLabel}
                title={playbackLabel}
            >
                {status === "running" ? "II" : ">"}
            </Button>
            <ClockControlsGroup role="group" aria-label="Time scale">
                {SCALE_OPTIONS.map((value) => (
                    <Button
                        key={value}
                        size="sm"
                        variant={timeScale === value ? "primary" : "ghost"}
                        isSelected={timeScale === value}
                        onClick={() => handleScaleToggle(value)}
                        aria-pressed={timeScale === value}
                    >
                        {value}x
                    </Button>
                ))}
            </ClockControlsGroup>
        </>
    );
};
