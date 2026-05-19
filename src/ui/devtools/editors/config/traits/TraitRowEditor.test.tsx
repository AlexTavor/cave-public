// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../state/useSessionStore";
import { createCartridge } from "../../../../../engine/test/factories";
import { setByPath } from "../../../../../utils/objectUtils";
import { TraitRowEditor } from "./TraitRowEditor";

const filename = "modules/core.cave";
const REGISTRY = "config.traits";

describe("TraitRowEditor", () => {
    beforeEach(() => {
        useSessionStore.setState({ sessions: {} });
        const store = useSessionStore.getState();
        store.initSession(filename, createCartridge(filename));
        store.updateDraft(filename, (draft) => {
            setByPath(draft, `${REGISTRY}.fire-resistance`, {
                id: "fire-resistance",
                label: "Fire Resistance",
                description: "Reduces fire damage",
            });
        });
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
    });

    it("shows the trait id in the header", () => {
        render(
            <ThemeProvider>
                <TraitRowEditor
                    filename={filename}
                    traitId="fire-resistance"
                    registryPath={REGISTRY}
                    onDelete={() => {}}
                    onRename={() => null}
                />
            </ThemeProvider>,
        );

        expect(screen.getByText("fire-resistance")).toBeDefined();
        expect(screen.getByText("Fire Resistance")).toBeDefined();
    });

    it("does not show an id field inside the form body", () => {
        render(
            <ThemeProvider>
                <TraitRowEditor
                    filename={filename}
                    traitId="fire-resistance"
                    registryPath={REGISTRY}
                    onDelete={() => {}}
                    onRename={() => null}
                />
            </ThemeProvider>,
        );

        expect(screen.queryByText("Trait ID")).toBeNull();
    });
});

