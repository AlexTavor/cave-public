import { describe, expect, it } from "vitest";
import { DEFAULT_BACKGROUND_CONFIG } from "../../../data/schemas/assets";
import {
    parseBackgroundConfig,
    readRawBackgroundConfig,
} from "./backgroundRuntimeHelpers";

describe("backgroundRuntimeHelpers", () => {
    it("reads the authored subtree when present", () => {
        const assets = { settings: { background: { enabled: true } } };
        expect(readRawBackgroundConfig(assets)).toEqual({ enabled: true });
    });

    it("returns undefined for missing raw config", () => {
        expect(readRawBackgroundConfig({ settings: {} })).toBeUndefined();
        expect(readRawBackgroundConfig(undefined)).toBeUndefined();
    });

    it("parses authored config with defaults and defaults missing config", () => {
        expect(
            parseBackgroundConfig({
                settings: { background: { enabled: true } },
            }),
        ).toMatchObject({ ...DEFAULT_BACKGROUND_CONFIG, enabled: true });
        expect(parseBackgroundConfig({ settings: {} })).toEqual(
            DEFAULT_BACKGROUND_CONFIG,
        );
    });
});
