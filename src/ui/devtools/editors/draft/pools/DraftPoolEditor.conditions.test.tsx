// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { DraftPoolEditor } from "./DraftPoolEditor";
import { useSessionStore } from "../../../state/useSessionStore";
import { useModuleStore } from "../../../state/moduleStore";
import { createCartridge } from "../../../../../engine/test/factories";
import type { ModuleCartridge } from "../../../../../data/schemas/module";

describe("DraftPoolEditor conditions", () => {
    it("shows draft option condition refs inside the pool entry editor", () => {
        const filename = "game_data.json";
        const moduleData: ModuleCartridge = {
            ...createCartridge(filename),
            draftOptions: {
                opt_alpha: {
                    id: "opt_alpha",
                    title: "Alpha",
                    description: "",
                    rarity: "none",
                    icon: "unknown",
                    payload: [],
                },
            },
            draftPools: {
                pool_main: {
                    id: "pool_main",
                    texts: [],
                    entries: [{ optionId: "opt_alpha", weight: 1 }],
                },
            },
        };
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(filename, moduleData);
        useModuleStore.setState({
            modules: { [filename]: moduleData },
            loading: { [filename]: false },
            loadModule: async () => undefined,
        } as unknown as ReturnType<typeof useModuleStore.getState>);
        render(
            <ThemeProvider>
                <PortalManager>
                    <DraftPoolEditor filename={filename} poolId="pool_main" />
                </PortalManager>
            </ThemeProvider>,
        );
        fireEvent.click(screen.getByRole("button", { name: /Alpha/i }));
        expect(screen.getByText("Availability Conditions")).toBeDefined();
        expect(screen.getByText("+ Add Condition Ref")).toBeDefined();
    });
});
