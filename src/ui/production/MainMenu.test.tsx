// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    getPhaserDebugEnabled,
    setPhaserDebugEnabled,
} from "../../engine/phaser/debug/phaserDebugToggle";
import {
    getRuntimeInspectorEnabled,
    setRuntimeInspectorEnabled,
} from "../runtime/inspector/runtimeInspectorToggle";
import { ThemeProvider } from "../lib/foundation/theme/ThemeProvider";
import { MainMenu } from "./MainMenu";
import type { MainMenuActionModel } from "./main-menu/models";

const makeAction = (
    overrides: Partial<MainMenuActionModel>,
): MainMenuActionModel => ({
    description: "Action.",
    disabled: false,
    id: "new-game",
    label: "NEW GAME",
    onSelect: vi.fn(),
    tone: "primary",
    ...overrides,
});

const renderMenu = (actions: MainMenuActionModel[] = []) =>
    render(
        <ThemeProvider>
            <MainMenu
                actions={actions}
                errorText={null}
                statusText="Workspace ready."
                subtitle="A bio-factory hivemind tamagotchi"
                title="Cave"
            />
        </ThemeProvider>,
    );

afterEach(cleanup);
afterEach(() => setPhaserDebugEnabled(false));
afterEach(() => setRuntimeInspectorEnabled(false));

describe("MainMenu", () => {
    it("renders the title, status text, and action cards", () => {
        renderMenu([makeAction({ description: "Load the workspace." })]);
        expect(screen.getByText("Cave")).toBeDefined();
        expect(screen.getByRole("button", { name: /NEW GAME/ })).toBeDefined();
        expect(screen.getByText("Workspace ready.")).toBeDefined();
    });

    it("renders continue, new game, and save when those actions are provided", () => {
        renderMenu([
            makeAction({
                description: "Return.",
                id: "continue",
                label: "CONTINUE",
            }),
            makeAction({
                description: "Restart the run.",
            }),
            makeAction({
                description: "Write the save.",
                id: "save",
                label: "SAVE",
                tone: "default",
            }),
        ]);
        expect(screen.getByRole("button", { name: /CONTINUE/ })).toBeDefined();
        expect(screen.getByRole("button", { name: /NEW GAME/ })).toBeDefined();
        expect(screen.getByRole("button", { name: /SAVE/ })).toBeDefined();
    });

    it("does not invoke disabled actions and surfaces error text", () => {
        const onSelect = vi.fn();
        render(
            <ThemeProvider>
                <MainMenu
                    actions={[
                        makeAction({
                            description: "Blocked.",
                            disabled: true,
                            onSelect,
                        }),
                    ]}
                    errorText="Bootstrap failed."
                    statusText="Bootstrap failed."
                    subtitle="A bio-factory hivemind tamagotchi"
                    title="Cave"
                />
            </ThemeProvider>,
        );
        fireEvent.click(screen.getByRole("button", { name: /NEW GAME/ }));
        expect(onSelect).not.toHaveBeenCalled();
        expect(screen.getAllByText("Bootstrap failed.").length).toBeGreaterThan(
            0,
        );
    });

    it("toggles debug stats from the menu checkbox", () => {
        renderMenu();
        const checkbox = screen.getByRole("checkbox", { name: /Debug Stats/ });

        expect(getPhaserDebugEnabled()).toBe(false);
        fireEvent.click(checkbox);
        expect(getPhaserDebugEnabled()).toBe(true);
    });

    it("renders and toggles runtime inspector above debug stats", () => {
        renderMenu();
        const inspector = screen.getByRole("checkbox", {
            name: /Runtime Inspector/,
        });
        expect(getRuntimeInspectorEnabled()).toBe(false);
        fireEvent.click(inspector);
        expect(getRuntimeInspectorEnabled()).toBe(true);
    });
});
