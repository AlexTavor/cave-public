import { Variants } from "framer-motion";
import { AnimationType } from "./types";

export const DEFAULT_SPRING = {
    type: "spring" as const,
    stiffness: 500,
    damping: 30,
    mass: 1,
};

export const GENTLE_SPRING = {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
};

// Variants define: initial (hidden), animate (visible), exit (hidden)
export const ANIMATION_VARIANTS: Record<AnimationType, Variants> = {
    fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.3 } },
        exit: { opacity: 0, transition: { duration: 0.25 } },
    },
    scale: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1, transition: DEFAULT_SPRING },
        exit: { opacity: 0, scale: 0.95, transition: { duration: 0.25 } },
    },
    pop: {
        initial: { opacity: 0, scale: 0.8 },
        animate: { opacity: 1, scale: 1, transition: DEFAULT_SPRING },
        exit: { opacity: 0, scale: 0.8, transition: { duration: 0.25 } },
    },
    slideUp: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0, transition: DEFAULT_SPRING },
        exit: { opacity: 0, y: 20, transition: { duration: 0.25 } },
    },
    slideDown: {
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0, transition: DEFAULT_SPRING },
        exit: { opacity: 0, y: -20, transition: { duration: 0.25 } },
    },
    slideLeft: {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0, transition: DEFAULT_SPRING },
        exit: { opacity: 0, x: 20, transition: { duration: 0.25 } },
    },
    slideRight: {
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0, transition: DEFAULT_SPRING },
        exit: { opacity: 0, x: -20, transition: { duration: 0.25 } },
    },
};
