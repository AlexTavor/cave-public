import { forwardRef } from "react";
import { motion } from "framer-motion";
import { AnimatableProps } from "./types";
import { ANIMATION_VARIANTS } from "./variants";

/**
 * A standardized wrapper for entry/exit animations.
 * * NOTE: For exit animations to work, this component must be a direct child
 * of <AnimatePresence> (exported from this module) and must have a unique `key`.
 */
export const Animatable = forwardRef<HTMLDivElement, AnimatableProps>(
    (
        {
            children,
            type = "fade",
            layout = false,
            delay = 0,
            transition,
            className,
            style,
            ...rest
        },
        ref,
    ) => {
        const variants = ANIMATION_VARIANTS[type];

        // Merge default spring with custom delay
        const finalTransition = transition || undefined;

        return (
            <motion.div
                ref={ref}
                layout={layout}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={finalTransition}
                className={className}
                style={style}
                {...rest}
            >
                {children}
            </motion.div>
        );
    },
);

Animatable.displayName = "Animatable";

// Re-export AnimatePresence for convenience so consumers don't need 'framer-motion'
export { AnimatePresence } from "framer-motion";
