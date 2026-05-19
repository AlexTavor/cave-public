import React, { useState, forwardRef } from "react";
import { useTheme } from "@emotion/react";
import {
    ButtonContainer,
    ButtonContent,
    BaseLayer,
    EyeGradientLayer,
    IconWrapper,
    getVariantColor,
} from "./Button.styles";
import { ButtonProps } from "./types";
import {
    calculateBrightness,
    getFilterString,
    useClickPulse,
} from "./buttonInteraction";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = "primary",
            size = "md",
            isSelected = false,
            fullWidth = false,
            startIcon,
            onClick,
            disabled,
            style,
            className,
            animate,
            transition,
            ...motionProps
        },
        ref,
    ) => {
        const theme = useTheme();
        const [isHovered, setIsHovered] = useState(false);
        const { isClicking, triggerClick } = useClickPulse(150);

        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            if (disabled) return;
            triggerClick();
            onClick?.(e);
        };

        // Determine active color based on state and variant
        const activeColor = isSelected
            ? theme.colors.buttonSelected
            : getVariantColor(theme, variant);

        // The Eye is open if hovered or explicitly selected, but never if disabled
        const isEyeOpen = !disabled && (isHovered || isSelected);

        // Calculate numeric brightness
        const brightnessValue = calculateBrightness(isClicking, isHovered);

        // Construct the full filter string
        const filterString = getFilterString(brightnessValue);

        // Combine click animation with custom animate prop
        const combinedAnimate = isClicking
            ? { scale: 0.95 }
            : (animate ?? { scale: 1 });

        return (
            <ButtonContainer
                ref={ref}
                disabled={disabled}
                size={size}
                fullWidth={fullWidth}
                onClick={handleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onFocus={() => setIsHovered(true)} // Accessiblity: Show state on keyboard focus
                onBlur={() => setIsHovered(false)}
                animate={combinedAnimate}
                transition={isClicking ? { duration: 0.05 } : transition}
                style={style}
                className={className}
                {...motionProps}
            >
                <BaseLayer variant={variant} />

                <EyeGradientLayer
                    color={activeColor}
                    initial={{
                        opacity: 0,
                        scaleX: 0,
                        scaleY: 1,
                        filter: getFilterString(1), // Explicit initial filter
                    }}
                    animate={{
                        opacity: isEyeOpen ? 1 : 0,
                        scaleX: isEyeOpen ? 1 : 0,
                        scaleY: 1,
                        filter: filterString,
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                    }}
                />

                <ButtonContent>
                    {startIcon && <IconWrapper>{startIcon}</IconWrapper>}
                    {children}
                </ButtonContent>
            </ButtonContainer>
        );
    },
);

Button.displayName = "Button";
