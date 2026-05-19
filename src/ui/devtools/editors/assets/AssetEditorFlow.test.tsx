/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { fireEvent, waitFor, screen } from "@testing-library/react";
import { useModuleStore } from "../../state/moduleStore";
import { filename, setupAssetFlow } from "./AssetEditorFlow.testUtils";

vi.mock("../fields/module-explorer/DisplayAssetPreviewRuntime", () => ({
    DisplayAssetPreviewRuntime: () => null,
}));
vi.mock("./display/useDisplayViewEditor", () => ({
    useDisplayViewEditor: () => null,
}));
vi.mock("../view-editor/ViewEditorModal", () => ({
    ViewEditorModal: () => null,
}));

describe("AssetEditorFlow", () => {
    it("creates, renames, saves, and deletes a display asset", async () => {
        setupAssetFlow();
        fireEvent.click(await screen.findByText("Displays"));
        const addButton = await screen.findByTitle("Add New Item");
        fireEvent.click(addButton);
        const idInput = await screen.findByPlaceholderText("e.g. wraith");
        fireEvent.change(idInput, { target: { value: "magic_potion" } });
        fireEvent.click(screen.getByRole("button", { name: "Create" }));
        await screen.findByText("Display: magic_potion");
        const [styleInput, glyphInput] =
            await screen.findAllByPlaceholderText("e.g. wood");
        fireEvent.change(styleInput, { target: { value: "potion_style" } });
        fireEvent.change(glyphInput, { target: { value: "potion_glyph" } });
        fireEvent.click(screen.getByRole("button", { name: "Author Rule" }));
        fireEvent.change(screen.getByLabelText("Min Value"), {
            target: { value: "1" },
        });
        fireEvent.change(screen.getByLabelText("Min Radius"), {
            target: { value: "2" },
        });
        fireEvent.change(screen.getByLabelText("Max Value"), {
            target: { value: "5" },
        });
        fireEvent.change(screen.getByLabelText("Max Radius"), {
            target: { value: "6" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Apply" }));
        fireEvent.doubleClick(
            screen.getAllByText("magic_potion").at(-1) as Element,
        );
        const renameInput = screen.getByDisplayValue("magic_potion");
        fireEvent.change(renameInput, { target: { value: "magic_elixir" } });
        fireEvent.blur(renameInput);
        fireEvent.click(screen.getByRole("button", { name: "Back" }));
        await screen.findByText("magic_elixir");
        expect(screen.queryByText("magic_potion")).toBeNull();
        const saveButton = screen.getByRole("button", { name: "Save" });
        await waitFor(() =>
            expect((saveButton as HTMLButtonElement).disabled).toBe(false),
        );
        fireEvent.click(saveButton);
        await waitFor(() => {
            const mod = useModuleStore.getState().modules[filename];
            expect(mod.assets.displays["magic_elixir"]).toMatchObject({
                type: "resource",
                styleId: "potion_style",
                glyphKey: "potion_glyph",
                transferNodeRadiusByValue: {
                    minValue: 1,
                    minRadius: 2,
                    maxValue: 5,
                    maxRadius: 6,
                },
            });
            expect(mod.assets.displays["magic_potion"]).toBeUndefined();
        });
        const tile = screen.getByText("magic_elixir");
        fireEvent.mouseEnter(tile.parentElement?.parentElement as Element);
        fireEvent.click(await screen.findByTitle("Delete"));
        fireEvent.click(screen.getByRole("button", { name: "Delete" }));
        await waitFor(() => {
            const mod = useModuleStore.getState().modules[filename];
            expect(mod.assets.displays["magic_elixir"]).toBeUndefined();
        });
    }, 15000);
});

