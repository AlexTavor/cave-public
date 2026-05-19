// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { createCartridge } from "../../../../../engine/test/factories";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../state/useSessionStore";
import { AutocompleteStringField } from "./AutocompleteStringField";

const filename = "test.cave";
const path = "blueprint.settings.input";
const schema = z.string();
const suggestions = ["self.state.", "self.powerSink.baseDemand."];

const renderField = () =>
    render(
        <ThemeProvider>
            <AutocompleteStringField
                label="Target"
                schema={schema}
                filename={filename}
                path={path}
                suggestions={suggestions}
            />
        </ThemeProvider>,
    );

beforeEach(() => {
    useSessionStore.setState({ sessions: {} });
    useSessionStore.getState().initSession(filename, createCartridge(filename));
    useSessionStore.getState().updateDraft(filename, (draft) => {
        setByPath(draft, path, "");
    });
});

afterEach(() => {
    cleanup();
    useSessionStore.setState({ sessions: {} });
});

describe("AutocompleteStringField", () => {
    it("filters suggestions by substring", () => {
        renderField();
        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: "power" },
        });

        const options = Array.from(document.querySelectorAll("option")).map(
            (o) => o.value,
        );
        expect(options).toContain("self.powerSink.baseDemand.");
        expect(options).not.toContain("self.state.");
    });

    it("commits selected suggestion and typed value on blur", () => {
        renderField();
        const input = screen.getByRole("combobox");

        fireEvent.change(input, {
            target: { value: "self.powerSink.baseDemand." },
        });
        fireEvent.blur(input);

        const draft = useSessionStore.getState().sessions[filename]?.draft;
        expect(getByPath(draft, path)).toBe("self.powerSink.baseDemand.");

        fireEvent.change(input, { target: { value: "self.state.hp.value" } });
        fireEvent.blur(input);
        const latestDraft =
            useSessionStore.getState().sessions[filename]?.draft;
        expect(getByPath(latestDraft, path)).toBe("self.state.hp.value");
    });
});
