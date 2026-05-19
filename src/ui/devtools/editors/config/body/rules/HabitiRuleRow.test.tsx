// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCartridge } from "../../../../../../engine/test/factories";
import { getByPath } from "../../../../../../utils/objectUtils";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../../state/useSessionStore";
import { useToastStore } from "../../../../toast/toastStore";
import { HabitiRuleRow } from "./HabitiRuleRow";

const filename = "test.cave";
const path = "config.settings.body.habitusTypeRules.0";
const getRule = () =>
    getByPath(useSessionStore.getState().sessions[filename]?.draft, path);
const renderRow = () =>
    render(
        <ThemeProvider>
            <HabitiRuleRow filename={filename} index={0} onDelete={() => {}} />
        </ThemeProvider>,
    );
const initSession = (rules: any[]) =>
    useSessionStore.getState().initSession(
        filename,
        createCartridge(filename, {
            config: {
                habiti: {
                    alpha: {
                        id: "alpha",
                        label: "Alpha",
                        type: "species",
                        effects: [],
                        excludes: [],
                    },
                    gamma: {
                        id: "gamma",
                        label: "Gamma",
                        type: "species",
                        effects: [],
                        excludes: [],
                    },
                    beta: {
                        id: "beta",
                        label: "Beta",
                        type: "gender",
                        effects: [],
                        excludes: [],
                    },
                },
                settings: { body: { habitusTypeRules: rules } },
            },
        }),
    );

describe("HabitiRuleRow", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        useToastStore.setState({ items: [] });
    });
    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
        useToastStore.setState({ items: [] });
    });

    it("does not render legacy id, label, or required controls", () => {
        initSession([
            {
                habitusType: "species",
                probability: 1,
                maxCount: 1,
                weightedPool: [{ habitusId: "alpha", weight: 1 }],
            },
        ]);
        renderRow();
        fireEvent.click(screen.getByText("species"));
        expect(screen.queryByText("Label")).toBeNull();
        expect(screen.queryByText("Required")).toBeNull();
        expect(
            Boolean(screen.getByRole("combobox", { name: "Weighted Pool" })),
        ).toBe(true);
    });

    it("prunes incompatible entries and rejects duplicate rule types", () => {
        initSession([
            {
                habitusType: "species",
                probability: 1,
                maxCount: 1,
                weightedPool: [{ habitusId: "alpha", weight: 1 }],
            },
            {
                habitusType: "gender",
                probability: 1,
                maxCount: 1,
                weightedPool: [],
            },
        ]);
        renderRow();
        fireEvent.click(screen.getByText("species"));
        fireEvent.change(document.querySelector("select") as Element, {
            target: { value: "gender" },
        });
        expect(getRule().habitusType).toBe("species");
        expect(useToastStore.getState().items).toHaveLength(1);
    });
});
