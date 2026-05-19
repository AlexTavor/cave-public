import React, { useEffect, useMemo } from "react";
import { Cinematic } from "../cinematic/Cinematic";
import { useDormancyState } from "./useDormancyState";

export const DormancyOverlay: React.FC = () => {
    const { snapshot, awaken, pause } = useDormancyState();

    useEffect(() => {
        if (snapshot) pause();
    }, [snapshot, pause]);

    const cinematics = useMemo(() => {
        if (!snapshot) return [];
        return [
            "My last body dies, and I fade into darkness.",
            "I slumber, in the void.",
            `Until time and light dawn again.`,
            "I open my new eyes.",
        ];
    }, [snapshot]);

    if (!snapshot) return null;

    return <Cinematic cinematics={cinematics} onComplete={awaken} />;
};

