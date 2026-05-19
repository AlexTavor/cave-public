import { describe, expect, it } from "vitest";
import { applyPreviewSystemEntities } from "./previewSystemEntities";
import { DEFAULT_WORLD_POSITION } from "../../../../../data/schemas/v2/worldPositionDefaults";

describe("applyPreviewSystemEntities", () => {
    it("seeds world and pointer system entities", () => {
        const draft: any = { config: { settings: {} } };
        applyPreviewSystemEntities(draft, { x: 12, y: 34 });

        expect(draft.config.settings.world?.id).toBe("sys_world");
        expect(draft.config.settings.world?.physics).toMatchObject({
            x: 12,
            y: 34,
        });
        expect(draft.config.settings.pointer?.id).toBe("sys_pointer");
        expect(draft.config.settings.pointer?.physics).toMatchObject({
            x: DEFAULT_WORLD_POSITION.x,
            y: DEFAULT_WORLD_POSITION.y,
        });
    });
});
