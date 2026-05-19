import { ReactNode } from "react";
import {
    HTMLMotionProps,
    TargetAndTransition,
    Transition,
} from "framer-motion";

export type ButtonVariant = "primary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg" | "unpadded";

export interface ButtonProps
    extends Omit<HTMLMotionProps<"button">, "animate" | "transition"> {
    /**
     * The content to display inside the button.
     */
    children: ReactNode;

    /**
     * Visual style variant.
     * @default 'primary'
     */
    variant?: ButtonVariant;

    /**
     * Size preset affecting padding and font size.
     * @default 'md'
     */
    size?: ButtonSize;

    /**
     * Whether the button is in a selected/active state.
     * Forces the "Eye" gradient to be visible.
     * @default false
     */
    isSelected?: boolean;

    /**
     * If true, the button will take up the full width of its container.
     * @default false
     */
    fullWidth?: boolean;

    /**
     * An icon element to display before the text.
     */
    startIcon?: ReactNode;

    /**
     * Optional continuous animation for the button (e.g., pulsing).
     * This will be applied to the outer container.
     */
    animate?: TargetAndTransition;

    /**
     * Optional transition configuration for the animate prop.
     */
    transition?: Transition;

    /**
     * Optional Ref for the button element.
     * Handled via forwardRef in the component.
     */
    ref?: React.Ref<HTMLButtonElement>;
}
