import { describe, expect, it } from "vitest";
import type { TabNode } from "flexlayout-react";
import { resolveEditorComponent } from "./WindowLayoutResolver.editors";
import { UnderstandingEditor } from "../../editors/config/understanding/UnderstandingEditor";

describe("resolveEditorComponent understanding route", () => {
    it("routes understanding config editors", () => {
        const node = {
            getComponent: () => "understanding",
            getConfig: () => ({ filename: "modules/core.cave" }),
            getId: () => "understanding:modules/core.cave",
        } as unknown as TabNode;

        expect(resolveEditorComponent(node)?.type).toBe(UnderstandingEditor);
    });
});
