// @vitest-environment jsdom
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintList } from "./BlueprintList";
import { useModuleStore } from "../../../state/moduleStore";
import { useExplorerStore } from "./state/explorerStore";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../engine/test/factories";

const filename = "game.json";
const sessionId = "list::game.json::blueprints";

const renderWithProviders = (ui: React.ReactElement) =>
    render(
        <ThemeProvider>
            <PortalManager>{ui}</PortalManager>
        </ThemeProvider>,
    );

describe("BlueprintList", () => {
    beforeEach(() => {
        const moduleData = createCartridge(filename, {
            blueprints: {
                sys_one: createBlueprint("sys_one", {
                    tags: ["system"],
                    components: {},
                }),
                sys_two: createBlueprint("sys_two", {
                    tags: ["internal"],
                    components: {},
                }),
            },
        });

        useModuleStore.setState({
            modules: { [filename]: moduleData },
            indexes: {},
            loading: {},
            loadOrder: [],
        });
        useExplorerStore.getState().actions.initSession(sessionId);
    });

    afterEach(() => {
        cleanup();
        useExplorerStore.setState({ sessions: {} });
        useModuleStore.setState({
            modules: {},
            indexes: {},
            loading: {},
            loadOrder: [],
        });
    });

    it("shows empty state when filters exclude all blueprints", () => {
        renderWithProviders(
            <BlueprintList filename={filename} sessionId={sessionId} />,
        );
        expect(
            screen.getByText("No blueprints match the current filters."),
        ).toBeDefined();
    });
});
