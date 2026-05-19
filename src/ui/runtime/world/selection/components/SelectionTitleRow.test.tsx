// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PASSPORT_PERMANENT_TAG } from "../../../../../data/schemas/abilities/passport";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { SelectionTitleRow } from "./SelectionTitleRow";

const renderRow = (entity?: { id: string; tags?: string[] }) =>
    render(
        <ThemeProvider>
            <SelectionTitleRow
                title={<span>Forge</span>}
                entity={entity as any}
                runtime={null}
            />
        </ThemeProvider>,
    );

afterEach(cleanup);

describe("SelectionTitleRow", () => {
    it("shows a permanent badge for permanent entities", () => {
        renderRow({ id: "forge", tags: [PASSPORT_PERMANENT_TAG] });
        expect(screen.getByText("Forge")).toBeTruthy();
        expect(screen.getByText("Permanent")).toBeTruthy();
    });

    it("omits the badge for non-permanent entities", () => {
        renderRow({ id: "forge", tags: ["worker"] });
        expect(screen.queryByText("Permanent")).toBeNull();
    });
});
