import { HTMLMotionProps, Transition } from "framer-motion";
import { ReactNode } from "react";

export type AnimationType =
    | "fade"
    | "scale"
    | "slideUp"
    | "slideDown"
    | "slideLeft"
    | "slideRight"
    | "pop";

export interface AnimatableProps extends HTMLMotionProps<"div"> {
    children: ReactNode;

    /**
     * The type of animation to perform.
     * @default "fade"
     */
    type?: AnimationType;

    /**
     * If true, the component will animate layout changes (siblings moving when this item is removed).
     * @default false
     */
    layout?: boolean;

    /**
     * Optional delay in seconds before the enter animation starts.
     * @default 0
     */
    delay?: number;

    /**
     * Custom class name.
     */
    className?: string;

    /**
     * Optional custom transition to override the default spring.
     */
    transition?: Transition;
}
