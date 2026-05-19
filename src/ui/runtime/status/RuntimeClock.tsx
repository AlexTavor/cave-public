import React from "react";
import {
    Animatable,
    AnimatePresence,
} from "../../lib/atoms/animatable/Animatable";
import { ClockShell, ClockStrip } from "./RuntimeClock.styles";
import { RuntimeClockControls } from "./RuntimeClockControls";
import { useActiveRuntimeAttention } from "../attention/useActiveRuntimeAttention";

export const RuntimeClock: React.FC = () => {
    const attention = useActiveRuntimeAttention();

    return (
        <AnimatePresence initial={false}>
            {attention?.hideTimeControls ? null : (
                <Animatable key="runtime-clock" type="slideDown">
                    <ClockShell
                        aria-label="Runtime clock"
                        onClick={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <ClockStrip variant="default" padding="sm">
                            <RuntimeClockControls />
                        </ClockStrip>
                    </ClockShell>
                </Animatable>
            )}
        </AnimatePresence>
    );
};

