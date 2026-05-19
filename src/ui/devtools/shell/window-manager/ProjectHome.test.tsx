// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectHome } from "./ProjectHome";
import { useLayoutStore } from "../../state/useLayoutStore";
import { useShellStore } from "../shell";

vi.mock("../../project/ProjectExplorer", () => ({
    ProjectExplorer: ({
        onOpenFile,
    }: {
        onOpenFile: (path: string) => void;
    }) => <button onClick={() => onOpenFile("scripts/init.cvs")}>open</button>,
}));

describe("ProjectHome", () => {
    beforeEach(() => {
        useLayoutStore.setState({ openTab: vi.fn() } as any);
        useShellStore.setState({ openFile: vi.fn() } as any);
    });

    it("opens file tab and syncs shell via openFile", () => {
        render(<ProjectHome />);
        fireEvent.click(screen.getByText("open"));

        const openTab = useLayoutStore.getState().openTab as any;
        const openFile = useShellStore.getState().openFile as any;

        expect(openTab).toHaveBeenCalledWith(
            expect.objectContaining({
                component: "file",
                config: { path: "scripts/init.cvs" },
            }),
        );
        expect(openFile).toHaveBeenCalledWith("scripts/init.cvs");
    });
});
