// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { JobCard } from "./job-card/JobCard";
import {
    makeConditionalActivationFixture,
    renderSelectionCard,
} from "./conditionalActivationTestUtils";

afterEach(cleanup);

describe("conditional activation assignment job card", () => {
    it("shows only the inactive notice when assignment is inactive", () => {
        const assignment = {
            slots: 1,
            locking: false,
            filter: [],
            minimums: [],
            duration: 10,
            showProgress: false,
            oneOff: false,
            results: [],
        };
        const fixture = makeConditionalActivationFixture({
            entity: {
                assignment: { assignedIds: [] },
                state: { assignment_duration: { value: 10 } },
            },
            blueprint: { _editor: { abilities: { assignment } } },
            conditionalActivation: [
                {
                    priority: 0,
                    conditions: [],
                    targets: [{ ability: "assignment" }],
                    inactiveExplanation: "Need more understanding.",
                },
            ],
        });
        renderSelectionCard(
            <JobCard entity={fixture.entity} runtime={fixture.runtime} />,
        );

        expect(
            screen.getByTestId("conditional-activation-notice"),
        ).toBeTruthy();
        expect(
            screen.queryByRole("button", { name: "Select Bodies" }),
        ).toBeNull();
    });
});
