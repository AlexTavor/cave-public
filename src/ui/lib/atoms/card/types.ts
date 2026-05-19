import { ReactNode, HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Content to display inside the card
     */
    children: ReactNode;

    /**
     * Background variant from theme
     */
    variant?: "default" | "surface" | "highlight" | "modal" | "transparent";

    /**
     * Padding preset from theme
     */
    padding?: "none" | "xs" | "sm" | "md" | "lg" | "xl";

    /**
     * Whether the card should show hover effects (gold border)
     */
    interactive?: boolean;

    /**
     * Additional CSS class name
     */
    className?: string;
}
