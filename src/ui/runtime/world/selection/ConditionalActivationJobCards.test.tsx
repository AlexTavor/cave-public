// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AbsorptionCard } from "./absorption/AbsorptionCard";
import { JobCard } from "./job-card/JobCard";
import {
    makeConditionalActivationFixture,
    renderSelectionCard,
} from "./conditionalActivationTestUtils";

afterEach(cleanup);

describe("conditional activation job card wiring", () => {
    it("renders the notice in job and absorption cards", () => {
        const job = makeConditionalActivationFixture({
            entity: {
                powerSink: {
                    baseDemand: { body: 1, mind: 0, social: 0 },
                    throttle: 1,
                    efficiency: 1,
                    drawFraction: {},
                    status: "nominal",
                    showThrottleSlider: true,
                },
            },
        });
        renderSelectionCard(
            <JobCard entity={job.entity} runtime={job.runtime} />,
        );
        expect(
            screen.getByTestId("conditional-activation-notice"),
        ).toBeTruthy();
        cleanup();

        const absorption = makeConditionalActivationFixture();
        renderSelectionCard(
            <AbsorptionCard
                data={{
                    variant: "assignment",
                    label: "Forge",
                    description: "desc",
                    assignedIds: [],
                    duration: 10,
                    isSelectorOpen: false,
                    isDepleted: false,
                    requirements: { filterLabels: [], minimumRows: [] },
                    storageModels: [],
                }}
                entity={absorption.entity}
                runtime={absorption.runtime}
                onRecallBodies={vi.fn()}
                onOpenSelector={vi.fn()}
                onCloseSelector={vi.fn()}
                onConfirmBodies={vi.fn()}
                onCancelSelector={vi.fn()}
            />,
        );
        expect(
            screen.getByTestId("conditional-activation-notice"),
        ).toBeTruthy();
    });
});
