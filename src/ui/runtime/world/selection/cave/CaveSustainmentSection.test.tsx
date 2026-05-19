// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { RefObject } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { IconRegistryProvider } from "../../../../lib/foundation/icon-registry/IconRegistryProvider";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { createRuntimeTestDouble } from "../../testUtils";
import { CaveSustainmentSection } from "./CaveSustainmentSection";

afterEach(() => {
    cleanup();
});

describe("CaveSustainmentSection", () => {
    it("renders live food and heat current and max values", async () => {
        const emptyRef = { current: null } as RefObject<HTMLDivElement | null>;
        const entity = {
            id: "sys_world",
            state: {
                food: { value: 42, max: 170 },
                heat: { value: 36, max: 190 },
            },
        } as any;
        const runtimeDouble = createRuntimeTestDouble({
            getEntity: () => entity,
        });
        const view = render(
            <ThemeProvider>
                <IconRegistryProvider>
                    <CaveSustainmentSection
                        runtime={runtimeDouble.runtime}
                        entityId="sys_world"
                        foodFillRef={emptyRef}
                        heatFillRef={emptyRef}
                    />
                </IconRegistryProvider>
            </ThemeProvider>,
        );

        await waitFor(() =>
            expect(view.container.textContent).toMatch(/42\s*\/\s*170/),
        );
        expect(view.container.textContent).toMatch(/36\s*\/\s*190/);
        expect(view.container.textContent).not.toContain("/ 100");

        await act(async () => {
            entity.state.food.max = 210;
            entity.state.heat.value = 55;
            runtimeDouble.emitMutation({
                changedEntityIds: ["sys_world"],
                entityListChanged: false,
                blueprintChanged: false,
            });
        });

        await waitFor(() =>
            expect(view.container.textContent).toMatch(/42\s*\/\s*210/),
        );
        expect(view.container.textContent).toMatch(/55\s*\/\s*190/);
    });
});
