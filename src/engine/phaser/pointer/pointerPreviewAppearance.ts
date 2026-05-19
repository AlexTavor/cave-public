import type { Runtime } from "../../runtime/Runtime";
import {
    DisplayPaletteKey,
    DISPLAY_PALETTE_DEFAULT_COLORS,
} from "../../../lib/displays/displayKeyKinds";
import {
    readPointerStateNumber,
    readPointerStateString,
} from "./pointerPreviewState";

const NERVOUS_COLOR = 0x9c27b0;

const readColor = (key: DisplayPaletteKey): number =>
    Number.parseInt(DISPLAY_PALETTE_DEFAULT_COLORS[key].slice(1), 16);

export const resolvePreviewWidth = (runtime: Runtime): number => {
    const total = readPointerStateNumber(runtime, "pointer_preview_amount");
    return 2 + Math.min(8, Math.sqrt(Math.max(0, total)));
};

export const resolvePreviewColor = (runtime: Runtime): number => {
    if (readPointerStateString(runtime, "pointer_preview_mode") === "nervous") {
        return NERVOUS_COLOR;
    }
    const totals = [
        [
            DisplayPaletteKey.Body,
            readPointerStateNumber(runtime, "pointer_preview_body"),
        ],
        [
            DisplayPaletteKey.Mind,
            readPointerStateNumber(runtime, "pointer_preview_mind"),
        ],
        [
            DisplayPaletteKey.Social,
            readPointerStateNumber(runtime, "pointer_preview_social"),
        ],
    ] as [DisplayPaletteKey, number][];
    let best: [DisplayPaletteKey, number] = totals[0];
    for (const entry of totals.slice(1)) if (entry[1] > best[1]) best = entry;
    return readColor(best[0]);
};
