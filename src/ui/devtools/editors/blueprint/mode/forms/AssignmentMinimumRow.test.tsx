// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { createCartridge } from "../../../../../../engine/test/factories";
import { useSessionStore } from "../../../../state/useSessionStore";
import { AssignmentMinimumRow } from "./AssignmentMinimumRow";

afterEach(() => cleanup());

describe("AssignmentMinimumRow", () => {
    it("offers body-count minimums and hides the attribute field for that kind", () => {
        const filename = "test.json";
        useSessionStore.setState({ sessions: {} });
        useSessionStore
            .getState()
            .initSession(filename, createCartridge(filename));
        useSessionStore.getState().updateDraft(filename, (draft: any) => {
            draft.test = { minimums: [{ kind: "body_count", required: 2 }] };
        });
        render(
            <ThemeProvider>
                <AssignmentMinimumRow
                    filename={filename}
                    path="test.minimums.0"
                    index={0}
                    kind="body_count"
                    onDelete={vi.fn()}
                />
            </ThemeProvider>,
        );
        expect(screen.getByRole("option", { name: "body_count" })).toBeTruthy();
        expect(screen.queryByText("Attribute")).toBeNull();
    });
});
