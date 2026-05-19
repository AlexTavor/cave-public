// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintProvider } from "../../BlueprintContext";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../../engine/test/factories";
import { useSessionStore } from "../../../../state/useSessionStore";
import { CycleResourceCostsSection } from "./CycleResourceCostsSection";

describe("CycleResourceCostsSection", () => {
    it("adds and removes authored cycle cost rows", () => {
        const filename = "game.json";
        const blueprintId = "forge";
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(
            filename,
            createCartridge(filename, {
                blueprints: {
                    [blueprintId]: createBlueprint(blueprintId, {
                        _editor: {
                            abilities: { cycle: { resourceCosts: [] } },
                        },
                    }),
                },
            }),
        );
        render(
            <ThemeProvider>
                <PortalManager>
                    <BlueprintProvider value={{ filename, blueprintId }}>
                        <CycleResourceCostsSection
                            filename={filename}
                            basePath={`blueprints.${blueprintId}._editor.abilities.cycle`}
                        />
                    </BlueprintProvider>
                </PortalManager>
            </ThemeProvider>,
        );
        fireEvent.click(screen.getByText("+ Add Cycle Cost"));
        expect(screen.getByText("Remove Cycle Cost")).toBeDefined();
        expect(screen.getByText("Request / s @ 100% throttle")).toBeDefined();
        expect(screen.getByText("Request cadence (s)")).toBeDefined();
    });
});
