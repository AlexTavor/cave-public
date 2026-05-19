import { describe, expect, it } from "vitest";
import { createCartridge } from "../../../engine/test/factories";
import {
    createDraftOptionInModule,
    createDraftPoolInModule,
    deleteDraftOptionFromModule,
    deleteDraftPoolFromModule,
} from "./moduleStore.drafts";

describe("moduleStore.drafts", () => {
    it("creates unique draft options", () => {
        const base = createCartridge("test.module");
        const first = createDraftOptionInModule({ moduleData: base });
        const second = createDraftOptionInModule({
            moduleData: first.updated,
        });

        expect(first.optionId).toMatch(/^opt_/);
        expect(second.optionId).toMatch(/^opt_/);
        expect(first.optionId).not.toBe(second.optionId);
        expect(first.updated.draftOptions?.[first.optionId]).toBeTruthy();
        expect(second.updated.draftOptions?.[second.optionId]).toBeTruthy();
    });

    it("deletes draft options", () => {
        const base = createCartridge("test.module");
        const created = createDraftOptionInModule({ moduleData: base });
        const next = deleteDraftOptionFromModule({
            moduleData: created.updated,
            optionId: created.optionId,
        });

        expect(next.draftOptions?.[created.optionId]).toBeUndefined();
    });

    it("creates unique draft pools", () => {
        const base = createCartridge("test.module");
        const first = createDraftPoolInModule({ moduleData: base });
        const second = createDraftPoolInModule({
            moduleData: first.updated,
        });

        expect(first.poolId).toMatch(/^pool_/);
        expect(second.poolId).toMatch(/^pool_/);
        expect(first.poolId).not.toBe(second.poolId);
        expect(first.updated.draftPools?.[first.poolId]).toBeTruthy();
        expect(second.updated.draftPools?.[second.poolId]).toBeTruthy();
    });

    it("deletes draft pools", () => {
        const base = createCartridge("test.module");
        const created = createDraftPoolInModule({ moduleData: base });
        const next = deleteDraftPoolFromModule({
            moduleData: created.updated,
            poolId: created.poolId,
        });

        expect(next.draftPools?.[created.poolId]).toBeUndefined();
    });
});
