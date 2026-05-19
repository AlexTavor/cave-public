// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLayoutStore } from "../../state/useLayoutStore";
import { useShellStore } from "../shell";
import { makeTabId } from "../window-manager/tabIds";
import { useSyncActiveTabToShellPath } from "./useSyncActiveTabToShellPath";

const Harness = () => {
    useSyncActiveTabToShellPath();
    return null;
};

describe("useSyncActiveTabToShellPath integration", () => {
    beforeEach(() => {
        useLayoutStore.setState({ activeTabId: null });
    });

    it("syncs shell to list tab even when shell points elsewhere", () => {
        const openFile = vi.fn();
        const filename = "modules/progression.draft";
        useShellStore.setState({
            activeFilePath: `pool::${filename}::starter`,
            openFile,
        });
        useLayoutStore.setState({
            activeTabId: makeTabId({
                kind: "draft_pool_list",
                filename,
            }),
        });

        render(<Harness />);

        expect(openFile).toHaveBeenCalledWith(`list::${filename}::draft_pools`);
    });

    it("uses setActiveFileTabPath for file tabs", () => {
        const setActiveFileTabPath = vi.fn();
        const openFile = vi.fn();
        useShellStore.setState({
            activeFilePath: null,
            openFile,
            setActiveFileTabPath,
        });
        useLayoutStore.setState({
            activeTabId: "file:manifest.json",
        });

        render(<Harness />);

        expect(setActiveFileTabPath).toHaveBeenCalledWith("manifest.json");
        expect(openFile).not.toHaveBeenCalled();
    });

    it("syncs shell path when tab selection is the source of truth", () => {
        const openFile = vi.fn();
        const filename = "modules/progression.draft";
        useShellStore.setState({ activeFilePath: null, openFile });
        useLayoutStore.setState({
            activeTabId: makeTabId({
                kind: "draft_pool_editor",
                filename,
                poolId: "starter",
            }),
        });

        render(<Harness />);

        expect(openFile).toHaveBeenCalledWith(`pool::${filename}::starter`);
    });

    it("ignores stale tab selection while shell navigation is opening a new route", () => {
        const openFile = vi.fn();
        const filename = "modules/progression.draft";
        useShellStore.setState({
            activeFilePath: `list::${filename}::assets::displays`,
            openFile,
        });
        useLayoutStore.setState({
            activeTabId: makeTabId({
                kind: "asset_list",
                filename,
                category: "displays",
            }),
        });

        const view = render(<Harness />);
        openFile.mockClear();

        useShellStore.setState({
            activeFilePath: `${filename}::assets::displays::wood`,
        });
        view.rerender(<Harness />);

        expect(openFile).not.toHaveBeenCalled();
    });
});

