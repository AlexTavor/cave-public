import React from "react";

/**
 * Props the terminal's suggestion-popover slot is rendered with. Mirrors the ui
 * Popover atom's contract so the real Popover is assignable here — without lib
 * importing ui (lib must stay below ui; see the `lib-stays-low` boundary rule).
 */
export interface PopoverSlotProps {
    triggerRef: React.RefObject<HTMLElement | null>;
    isOpen: boolean;
    children: React.ReactNode;
}

/**
 * A render function for the popover slot (a render prop, not a component — so an
 * injected, host-owned Popover can be called during render without tripping the
 * "component created during render" lint rule).
 */
export type PopoverSlotRenderer = (props: PopoverSlotProps) => React.ReactNode;

/**
 * Default slot: render children inline (no portal/positioning). The application
 * injects the real positioned Popover via {@link PopoverSlotProvider} at its
 * composition root, so this fallback only applies when the terminal is rendered
 * standalone (e.g. lib-level tests).
 */
const renderInline: PopoverSlotRenderer = ({ children }) => <>{children}</>;

const PopoverSlotContext =
    React.createContext<PopoverSlotRenderer>(renderInline);

export const PopoverSlotProvider = PopoverSlotContext.Provider;

/** Returns the popover render function the host injected (or the inline fallback). */
export const usePopoverSlot = (): PopoverSlotRenderer =>
    React.useContext(PopoverSlotContext);
