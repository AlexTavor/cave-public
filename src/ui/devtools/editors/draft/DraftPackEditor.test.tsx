// @vitest-environment jsdom
import { fireEvent, render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { DraftPackEditor } from "./DraftPackEditor";

const openFileMock = vi.fn();
vi.mock("../../shell/shell", () => ({
    useShellStore: (selector: (s: any) => any) =>
        selector({ openFile: openFileMock }),
}));

afterEach(() => {
    cleanup();
    openFileMock.mockClear();
});

const renderEditor = (filename: string) =>
    render(
        <ThemeProvider>
            <DraftPackEditor filename={filename} />
        </ThemeProvider>,
    );

describe("DraftPackEditor", () => {
    it("opens draft options on card click", () => {
        const { getByText } = renderEditor("modules/progression.draft");
        fireEvent.click(getByText("Draft Options"));
        expect(openFileMock).toHaveBeenCalledWith(
            "options::modules/progression.draft",
        );
    });

    it("opens draft pools on card click", () => {
        const { getByText } = renderEditor("modules/progression.draft");
        fireEvent.click(getByText("Draft Pools"));
        expect(openFileMock).toHaveBeenCalledWith(
            "list::modules/progression.draft::draft_pools",
        );
    });
});
