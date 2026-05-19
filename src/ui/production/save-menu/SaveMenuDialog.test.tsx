// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../lib/foundation/portal-manager/PortalManager";
import { SaveMenuDialog } from "./SaveMenuDialog";

const wrap = (props: Partial<Parameters<typeof SaveMenuDialog>[0]> = {}) =>
    render(
        <ThemeProvider>
            <PortalManager>
                <SaveMenuDialog
                    availableSaves={["alpha", "beta"]}
                    canSave
                    currentSaveName="alpha"
                    isOpen
                    mode="save"
                    onClose={vi.fn()}
                    onDelete={vi.fn()}
                    onLoad={vi.fn()}
                    onSaveAs={vi.fn()}
                    {...props}
                />
            </PortalManager>
        </ThemeProvider>,
    );

afterEach(cleanup);

describe("SaveMenuDialog", () => {
    it("renders save mode with input and slots", () => {
        wrap();
        expect(screen.getByPlaceholderText("Save name")).toBeDefined();
        expect(screen.getByText("alpha")).toBeDefined();
    });

    it("renders load mode without the save input", () => {
        wrap({ mode: "load" });
        expect(screen.queryByPlaceholderText("Save name")).toBeNull();
        expect(screen.getByText("beta")).toBeDefined();
    });

    it("wires save, load, and delete actions", () => {
        const onSaveAs = vi.fn();
        const onLoad = vi.fn();
        const onDelete = vi.fn();
        wrap({ onDelete, onLoad, onSaveAs });
        fireEvent.change(screen.getByPlaceholderText("Save name"), {
            target: { value: "slot-a" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Save As" }));
        fireEvent.click(
            screen.getAllByRole("button", { name: "Overwrite" })[0],
        );
        fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[1]);
        expect(onSaveAs).toHaveBeenCalled();
        expect(onDelete).toHaveBeenCalledWith("beta");
        expect(onLoad).not.toHaveBeenCalled();
    });
});
