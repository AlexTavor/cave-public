// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../state/useSessionStore";
import { createCartridge } from "../../../../../engine/test/factories";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { UnionField } from "./UnionField";

const filename = "test.json";
const path = "assets.settings.testUnion";
const schema = z.union([z.number(), z.string()]);

const renderField = () =>
    render(
        <ThemeProvider>
            <UnionField
                label="Value"
                schema={schema}
                filename={filename}
                path={path}
            />
        </ThemeProvider>,
    );

beforeEach(() => {
    useSessionStore.setState({ sessions: {} });
    useSessionStore.getState().initSession(filename, createCartridge(filename));
    useSessionStore.getState().updateDraft(filename, (draft) => {
        setByPath(draft, path, "hello");
    });
});

afterEach(() => {
    cleanup();
    useSessionStore.setState({ sessions: {} });
});

describe("UnionField", () => {
    it("switches union types", () => {
        renderField();

        const select = screen.getByLabelText("Union type");
        expect((select as HTMLSelectElement).value).toBe("1");

        fireEvent.change(select, { target: { value: "0" } });

        const draft = useSessionStore.getState().sessions[filename]?.draft;
        expect(getByPath(draft, path)).toBe(0);
    });
});
