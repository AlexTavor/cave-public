// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { useDisplayImageExportStore } from "./useDisplayImageExportStore";

describe("useDisplayImageExportStore", () => {
    it("stores and clears the singleton export service", () => {
        const first = { getImageUrl: async () => "a", clear() {} };

        useDisplayImageExportStore.getState().clear();
        useDisplayImageExportStore.getState().setService(first);

        expect(useDisplayImageExportStore.getState().service).toBe(first);
        useDisplayImageExportStore.getState().clear();
        expect(useDisplayImageExportStore.getState().service).toBeNull();
    });
});
