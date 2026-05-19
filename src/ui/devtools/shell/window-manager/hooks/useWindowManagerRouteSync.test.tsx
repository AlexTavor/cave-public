// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useWindowManagerRouteSync } from "./useWindowManagerRouteSync";

const ensureMock = vi.hoisted(() => vi.fn(async () => undefined));
const openTab = vi.fn();

vi.mock("../../../state/moduleSession", () => ({
    useModuleSessionLoader: () => ensureMock,
}));

const Harness = ({ activeFilePath }: { activeFilePath: string | null }) => {
    useWindowManagerRouteSync({
        activeFilePath,
        openTab,
        getLabel: () => "x",
        initExplorerSession: vi.fn(),
    });
    return null;
};

describe("useWindowManagerRouteSync", () => {
    it("ignores plain file paths without virtual route separators", () => {
        render(
            <Harness activeFilePath="cave_roguelite_gdd_v2/manifest.json" />,
        );
        expect(ensureMock).not.toHaveBeenCalled();
        expect(openTab).not.toHaveBeenCalled();
    });

    it("does not reopen the same virtual route on rerender", () => {
        const route = "pool::modules/progression.draft::starter";
        const view = render(<Harness activeFilePath={route} />);
        const callsAfterFirstRender = openTab.mock.calls.length;
        view.rerender(<Harness activeFilePath={route} />);
        expect(openTab).toHaveBeenCalledTimes(callsAfterFirstRender);
    });
});
