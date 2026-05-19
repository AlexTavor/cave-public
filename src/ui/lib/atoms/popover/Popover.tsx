import React, { useEffect } from "react";
import {
    autoUpdate,
    flip,
    offset,
    shift,
    useFloating,
} from "@floating-ui/react";
import { Portal } from "../../foundation/portal-manager/Portal";

export interface PopoverProps {
    triggerRef: React.RefObject<HTMLElement | null>;
    isOpen: boolean;
    children: React.ReactNode;
}

export const Popover: React.FC<PopoverProps> = ({
    triggerRef,
    isOpen,
    children,
}) => {
    const { refs, floatingStyles } = useFloating({
        placement: "top-start",
        open: isOpen,
        middleware: [offset(6), flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate,
    });

    useEffect(() => {
        if (!isOpen) return;
        const anchor = triggerRef.current;
        if (!anchor) return;
        refs.setReference(anchor);
    }, [isOpen, refs, triggerRef]);

    if (!isOpen) {
        return null;
    }

    return (
        <Portal layer="float">
            <div
                ref={refs.setFloating}
                style={{
                    ...floatingStyles,
                    pointerEvents: "auto",
                }}
            >
                {children}
            </div>
        </Portal>
    );
};
