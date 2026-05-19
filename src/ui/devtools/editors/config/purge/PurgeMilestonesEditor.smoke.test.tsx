// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCartridge } from "../../../../../engine/test/factories";
import { getByPath } from "../../../../../utils/objectUtils";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { useSessionStore } from "../../../state/useSessionStore";
import { PurgeMilestonesEditor } from "./PurgeMilestonesEditor";
import type { PurgeMilestone } from "../../../../../data/schemas/game/config";
import { MILESTONES_PATH } from "./usePurgeMilestonesSession";

const filename = "modules/core.cave";

const getMilestones = (): PurgeMilestone[] =>
    (getByPath(
        useSessionStore.getState().sessions[filename]?.draft,
        MILESTONES_PATH,
    ) as PurgeMilestone[] | undefined) ?? [];

const renderEditor = () =>
    render(
        <ThemeProvider>
            <PurgeMilestonesEditor filename={filename} />
        </ThemeProvider>,
    );

describe("PurgeMilestonesEditor", () => {
    beforeEach(() => {
        localStorage.clear();
        useSessionStore.setState({ sessions: {} });
        useSessionStore
            .getState()
            .initSession(filename, createCartridge(filename));
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ sessions: {} });
        localStorage.clear();
    });

    it("renders Add Milestone button without errors", () => {
        renderEditor();
        expect(screen.getByText("+ Add Milestone")).toBeDefined();
    });

    it("adds a milestone to the draft on click", () => {
        renderEditor();
        fireEvent.click(screen.getByText("+ Add Milestone"));

        const milestones = getMilestones();
        expect(milestones).toHaveLength(1);
        expect(milestones[0].threshold).toBe(0.5);
        expect(milestones[0].messages).toEqual([]);
    });

    it("renders a form for each milestone", () => {
        renderEditor();
        fireEvent.click(screen.getByText("+ Add Milestone"));

        const milestones = getMilestones();
        expect(screen.getByText(milestones[0].id)).toBeDefined();
    });
});
