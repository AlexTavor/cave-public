import type React from "react";
import { ClockReadout } from "./RuntimeClock.styles";
import { useRuntimeClockTime } from "./useRuntimeClock";

export const RuntimeClockTimer: React.FC = () => {
    const timeRef = useRuntimeClockTime();
    return <ClockReadout ref={timeRef} />;
};