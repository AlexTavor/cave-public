import { describe, expect, it } from "vitest";
import type { TabNode } from "flexlayout-react";
import { resolveEditorComponent } from "./WindowLayoutResolver.editors";
import { GuidancesEditor } from "../../editors/config/guidances/GuidancesEditor";

describe("resolveEditorComponent guidances route", () => {
    it("routes guidances config editors", () => {
        const node = {
            getComponent: () => "guidances",
            getConfig: () => ({ filename: "modules/core.cave" }),
            getId: () => "guidances:modules/core.cave",
        } as unknown as TabNode;

        expect(resolveEditorComponent(node)?.type).toBe(GuidancesEditor);
    });
});
