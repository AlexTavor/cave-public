// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createCartridge } from "../../../../../../engine/test/factories";
import { useModuleStore } from "../../../../state/moduleStore";
import { useSessionStore } from "../../../../state/useSessionStore";
import { usePassportDisplayKeys } from "./usePassportDisplayKeys";

describe("usePassportDisplayKeys", () => {
    it("includes authored display keys from the top-level linked asset file", () => {
        useModuleStore.setState({
            modules: {
                "modules/assets.art": createCartridge("modules/assets.art", {
                    assets: { displays: { worker_icon: { type: "resource" } } },
                }),
            },
        } as any);
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(
            "modules/assets.art",
            createCartridge("modules/assets.art", {
                assets: { displays: { worker_icon: { type: "resource" } } },
            }),
        );

        const { result } = renderHook(() =>
            usePassportDisplayKeys(
                "modules/understanding/what_am_i.bp",
                "worker",
            ),
        );

        expect(result.current.assetFilename).toBe("modules/assets.art");
        expect(result.current.displayKeys).toContain("worker_icon");
        expect(result.current.displayKeys).toContain("worker");
    });
});
