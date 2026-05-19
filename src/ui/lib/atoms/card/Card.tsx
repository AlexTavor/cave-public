import { forwardRef } from "react";
import { useTheme } from "@emotion/react";
import { CardProps } from "./types";
import { CardContainer, CardBackground } from "./Card.styles";

export const Card = forwardRef<HTMLDivElement, CardProps>(
    (
        {
            children,
            variant = "default",
            padding = "md",
            interactive = false,
            className,
            ...rest
        },
        ref,
    ) => {
        const theme = useTheme();

        const variantColorMap = {
            default: theme.colors.background,
            surface: theme.colors.surface,
            highlight: theme.colors.surfaceHighlight,
            modal: theme.colors.modal,
            transparent: "transparent",
        };

        const paddingValue = padding === "none" ? "0" : theme.spacing[padding];

        return (
            <CardContainer
                ref={ref}
                padding={paddingValue}
                interactive={interactive}
                className={className}
                {...rest}
            >
                <CardBackground
                    background={variantColorMap[variant]}
                    interactive={interactive}
                    borderRadius={theme.radius.md}
                    borderColor={
                        variant === "transparent"
                            ? "transparent"
                            : theme.colors.surfaceHighlight
                    }
                    hoverBorderColor={
                        variant === "transparent"
                            ? "transparent"
                            : theme.colors.buttonSelected
                    }
                />
                {children}
            </CardContainer>
        );
    },
);

Card.displayName = "Card";
