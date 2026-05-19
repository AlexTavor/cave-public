import { useState, forwardRef, useMemo, useContext } from "react";
import {
    useFloating,
    offset,
    flip,
    shift,
    autoUpdate,
    useHover,
    useInteractions,
    useDismiss,
    useRole,
    FloatingPortal,
    useFloatingNodeId,
    FloatingNode,
    safePolygon,
    useMergeRefs,
} from "@floating-ui/react";
import { TooltipProps } from "./types";
import { TooltipContainer } from "./SmartTooltip.styles";
import { useTooltipVisibility } from "./useTooltipVisibility";
import { renderTooltipTrigger } from "./TooltipTrigger";
import { Card } from "../card";
import { PortalContext } from "../../foundation/portal-manager/PortalContext";

export const SmartTooltip = forwardRef<HTMLElement, TooltipProps>(
    (
        {
            content,
            children,
            placement = "top-start",
            enterDelay = 200,
            leaveDelay = 100,
            offset: offsetValue = 8,
            className,
            disabled = false,
            hideCard = false,
        },
        propRef,
    ) => {
        const [isOpen, setIsOpen] = useState(false);
        const isVisible = useTooltipVisibility(isOpen);
        const tooltipRoot = useContext(PortalContext)?.roots.tooltip ?? null;

        const nodeId = useFloatingNodeId();

        const middleware = useMemo(() => {
            return [offset(offsetValue), flip(), shift()];
        }, [offsetValue]);

        const { refs, floatingStyles, context } = useFloating({
            nodeId,
            open: isOpen,
            onOpenChange: setIsOpen,
            placement,
            middleware,
            whileElementsMounted: autoUpdate,
        });

        // Merge the local floating ref with any forwarded ref from a parent
        // This allows tooltips to be nested or wrapped by other positioning logic
        const triggerRef = useMergeRefs([refs.setReference, propRef]);

        const hover = useHover(context, {
            delay: {
                open: enterDelay,
                close: leaveDelay,
            },
            move: false,
            handleClose: safePolygon(),
        });

        const dismiss = useDismiss(context);
        const role = useRole(context, { role: "tooltip" });

        const { getReferenceProps, getFloatingProps } = useInteractions([
            hover,
            dismiss,
            role,
        ]);

        const trigger = renderTooltipTrigger({
            children,
            disabled,
            propRef,
            triggerRef,
            getReferenceProps,
        });

        if (disabled) {
            return <>{trigger}</>;
        }

        return (
            <FloatingNode id={nodeId}>
                {trigger}
                {(isOpen || isVisible) && (
                    <FloatingPortal root={tooltipRoot ?? undefined}>
                        <TooltipContainer
                            ref={refs.setFloating}
                            style={floatingStyles}
                            isVisible={isOpen}
                            className={className}
                            {...getFloatingProps()}
                        >
                            {hideCard ? content : <Card>{content}</Card>}
                        </TooltipContainer>
                    </FloatingPortal>
                )}
            </FloatingNode>
        );
    },
);

SmartTooltip.displayName = "SmartTooltip";

