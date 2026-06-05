import type { PopoverSlotProps } from "../../../../lib/terminal/PopoverSlot";
import { Popover } from "./Popover";

/**
 * ui-side adapter that fills the terminal's lib-owned popover slot with the real
 * positioned Popover atom. Passed to `PopoverSlotProvider` at the app composition
 * root (and in component tests) so lib's SmartInput stays below ui.
 */
export const renderPopoverSlot = (props: PopoverSlotProps) => (
    <Popover {...props} />
);
