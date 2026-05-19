import { describe, expect, it } from "vitest";
import type { TabNode } from "flexlayout-react";
import { resolveEditorComponent } from "./WindowLayoutResolver.editors";
import { TutorialsEditor } from "../../editors/config/tutorials/TutorialsEditor";

describe("resolveEditorComponent tutorials route", () => {
    it("routes tutorials config editors", () => {
        const node = {
            getComponent: () => "tutorials",
            getConfig: () => ({ filename: "modules/core.cave" }),
            getId: () => "tutorials:modules/core.cave",
        } as unknown as TabNode;

        expect(resolveEditorComponent(node)?.type).toBe(TutorialsEditor);
    });
});
