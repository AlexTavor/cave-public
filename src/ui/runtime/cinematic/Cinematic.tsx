import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
    CinematicContainer,
    BlackOverlay,
    CinematicText,
    CINEMATIC_FADE_DURATION,
    EARLY_OUT,
} from "./Cinematic.styles";

interface CinematicProps {
    cinematics?: string[];
    onComplete?: () => void;
}

type AnimationPhase = "fade-in" | "display" | "complete";

export const Cinematic = ({ cinematics = [], onComplete }: CinematicProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [phase, setPhase] = useState<AnimationPhase>("fade-in");
    const [overlayVisible, setOverlayVisible] = useState(false);

    // Only show if there are cinematics
    const isActive = cinematics.length > 0;

    // Reset when cinematics change
    useEffect(() => {
        if (cinematics.length > 0) {
            setCurrentIndex(0);
            setPhase("fade-in");
            setOverlayVisible(false);
            // Trigger fade-in on next frame
            setTimeout(() => setOverlayVisible(true), 10);
        }
    }, [cinematics]);

    // Auto-transition from fade-in to display
    useEffect(() => {
        if (phase === "fade-in" && isActive) {
            const timer = setTimeout(() => {
                setPhase("display");
            }, CINEMATIC_FADE_DURATION); // Wait for black overlay fade-in
            return () => clearTimeout(timer);
        }
    }, [phase, isActive]);

    const handleClick = () => {
        if (phase !== "display") return;

        if (currentIndex < cinematics.length - 1) {
            // Move to next text
            setCurrentIndex((prev) => prev + 1);
        } else {
            // Done with all texts, fade out
            setPhase("complete");
            setOverlayVisible(false);
            setTimeout(() => {
                onComplete?.();
            }, EARLY_OUT); // Call onComplete slightly before fade-out finishes for snappier feel
        }
    };

    if (!isActive) return null;

    const currentText = cinematics[currentIndex];

    return (
        <CinematicContainer onClick={handleClick}>
            <BlackOverlay $visible={overlayVisible} />
            <AnimatePresence mode="wait">
                {phase === "display" && currentText && (
                    <CinematicText
                        key={currentIndex}
                        initial={{ opacity: 0, x: -100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        transition={{ duration: 0.4 }}
                    >
                        {currentText}
                    </CinematicText>
                )}
            </AnimatePresence>
        </CinematicContainer>
    );
};
