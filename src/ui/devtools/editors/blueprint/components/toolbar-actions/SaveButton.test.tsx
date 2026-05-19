// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";

const mocks = vi.hoisted(() => ({
    moduleSave: vi.fn(async () => undefined),
    assetSave: vi.fn(async () => undefined),
    enqueue: vi.fn(),
    addLog: vi.fn(),
}));

vi.mock("../../BlueprintContext", () => ({
    useBlueprintContext: () => ({
        filename: "modules/outside.bp",
        blueprintId: "outside",
    }),
}));
vi.mock("../../../../state/moduleSession", () => ({
    useEnsureModuleSession: vi.fn(),
    useModuleSession: (filename: string) =>
        filename.endsWith("assets.art")
            ? { isDirty: true, save: mocks.assetSave }
            : { isDirty: true, save: mocks.moduleSave },
}));
vi.mock("../../../../state/moduleSession/useBlueprintSlice", () => ({
    useBlueprintSlice: () => ({ components: { display: {} } }),
}));
vi.mock("../../hooks/useBlueprintValidation", () => ({
    useBlueprintValidation: () => ({ hasErrors: false }),
}));
vi.mock("../../../../../runtime/state/useRuntimeStore", () => ({
    useRuntimeStore: (selector: (state: any) => unknown) =>
        selector({ runtime: { commands: { enqueue: mocks.enqueue } } }),
}));
vi.mock("../../../../state/useTerminalStore", () => ({
    useTerminalStore: () => ({ addLog: mocks.addLog }),
}));
vi.mock("../../../../state/useSessionStore", () => ({
    useSessionStore: (selector: (state: any) => unknown) =>
        selector({ sessions: { "modules/outside.bp": { isDirty: true } } }),
}));

import { SaveButton } from "./SaveButton";

describe("SaveButton", () => {
    it("saves linked asset sessions before saving the blueprint", async () => {
        render(
            <ThemeProvider>
                <SaveButton />
            </ThemeProvider>,
        );
        fireEvent.click(screen.getByRole("button", { name: "Save" }));
        await Promise.resolve();
        expect(mocks.assetSave).toHaveBeenCalledTimes(1);
        expect(mocks.moduleSave).toHaveBeenCalledTimes(1);
    });
});
