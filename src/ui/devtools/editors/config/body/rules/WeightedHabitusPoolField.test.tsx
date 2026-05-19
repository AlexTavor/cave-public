// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCartridge } from "../../../../../../engine/test/factories";
import { getByPath, setByPath } from "../../../../../../utils/objectUtils";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../../state/useSessionStore";
import { WeightedHabitusPoolField } from "./WeightedHabitusPoolField";

const filename = "test.cave";
const path = "config.settings.body.habitusTypeRules.0.weightedPool";
const readValue = () =>
    getByPath(
        useSessionStore.getState().sessions[filename]?.draft,
        path,
    ) as any[];

describe("WeightedHabitusPoolField", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useSessionStore
            .getState()
            .initSession(filename, createCartridge(filename));
        useSessionStore
            .getState()
            .updateDraft(filename, (draft) =>
                setByPath(draft, path, [{ habitusId: "alpha", weight: 1 }]),
            );
    });
    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("adds only exact suggestions and rejects comma input", () => {
        render(
            <ThemeProvider>
                <WeightedHabitusPoolField
                    label="Weighted Pool"
                    filename={filename}
                    path={path}
                    suggestions={["alpha", "beta"]}
                />
            </ThemeProvider>,
        );
        const input = screen.getByRole("combobox", { name: "Weighted Pool" });
        fireEvent.change(input, { target: { value: "alpha, beta" } });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));
        fireEvent.change(input, { target: { value: "beta" } });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));
        expect(readValue()).toEqual([
            { habitusId: "alpha", weight: 1 },
            { habitusId: "beta", weight: 1 },
        ]);
    });

    it("edits weights and removes one entry at a time", () => {
        render(
            <ThemeProvider>
                <WeightedHabitusPoolField
                    label="Weighted Pool"
                    filename={filename}
                    path={path}
                    suggestions={["alpha"]}
                />
            </ThemeProvider>,
        );
        fireEvent.change(screen.getByLabelText("alpha weight"), {
            target: { value: "3" },
        });
        expect(readValue()).toEqual([{ habitusId: "alpha", weight: 3 }]);
        fireEvent.click(screen.getByRole("button", { name: "Remove alpha" }));
        expect(readValue()).toEqual([]);
    });
});
