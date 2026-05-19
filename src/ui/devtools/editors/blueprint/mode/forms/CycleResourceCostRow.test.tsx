// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../../../lib/foundation/portal-manager/PortalManager";
import { BlueprintProvider } from "../../BlueprintContext";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../../engine/test/factories";
import { useSessionStore } from "../../../../state/useSessionStore";
import { CycleResourceCostRow } from "./CycleResourceCostRow";

describe("CycleResourceCostRow", () => {
    it("renders the cycle resource cost fields", () => {
        const filename = "game.json";
        const blueprintId = "forge";
        useSessionStore.setState({ sessions: {} });
        useSessionStore.getState().initSession(
            filename,
            createCartridge(filename, {
                blueprints: {
                    [blueprintId]: createBlueprint(blueprintId, {
                        _editor: {
                            abilities: {
                                cycle: {
                                    resourceCosts: [
                                        {
                                            resource: "food",
                                            amount: {
                                                base: 1,
                                                perBody: 0,
                                                multPerBody: 0,
                                            },
                                            scaleByBodiesOwned: false,
                                            scaleByCyclesCompleted: false,
                                            visible: true,
                                            priority: 0,
                                        },
                                    ],
                                },
                            },
                        },
                    }),
                },
            }),
        );
        render(
            <ThemeProvider>
                <PortalManager>
                    <BlueprintProvider value={{ filename, blueprintId }}>
                        <CycleResourceCostRow
                            filename={filename}
                            path={`blueprints.${blueprintId}._editor.abilities.cycle.resourceCosts.0`}
                            index={0}
                            onDelete={() => undefined}
                        />
                    </BlueprintProvider>
                </PortalManager>
            </ThemeProvider>,
        );
        expect(screen.getByText("Scale By Bodies Owned")).toBeDefined();
        expect(screen.getByText("Request / s @ 100% throttle")).toBeDefined();
        expect(screen.getByText("Request cadence (s)")).toBeDefined();
    });
});
