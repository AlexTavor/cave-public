import { Placement } from "@floating-ui/react";

export interface TooltipProps {
    /**
     * The content to render inside the tooltip.
     */
    content: React.ReactNode;

    /**
     * The element that triggers the tooltip on hover.
     */
    children: React.ReactNode;

    /**
     * Preferred placement of the tooltip relative to the trigger.
     * @default "top-start"
     */
    placement?: Placement;

    /**
     * Delay in ms before showing the tooltip.
     * @default 200
     */
    enterDelay?: number;

    /**
     * Delay in ms before hiding the tooltip after mouse leaves.
     * @default 100
     */
    leaveDelay?: number;

    /**
     * Distance in pixels between tooltip and trigger element.
     * @default 8
     */
    offset?: number;

    /**
     * Optional CSS class name for the tooltip container.
     */
    className?: string;

    /**
     * If true, tooltip is disabled and will not show.
     * @default false
     */
    disabled?: boolean;

    /**
     * If true, tooltip will not have Card background
     * @default false
     */
    hideCard?: boolean;
}

