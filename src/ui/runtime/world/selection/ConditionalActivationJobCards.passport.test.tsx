// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { JobCard } from "./job-card/JobCard";
import {
    makeConditionalActivationFixture,
    renderSelectionCard,
} from "./conditionalActivationTestUtils";

afterEach(cleanup);

describe("conditional activation passport job card", () => {
    it("hides title, fallback subtitle, and suspicious activity when passport is inactive", () => {
        const job = makeConditionalActivationFixture({
            blueprint: {
                components: {
                    display: {
                        label: "Trick Accountant",
                        display_key: "notice",
                    },
                },
                _editor: {
                    abilities: {
                        passport: { description: "Hidden passport ability." },
                        conditionalActivation: {
                            conditions: [],
                            targets: [{ ability: "passport" }],
                            inactiveExplanation: "Needs power.",
                        },
                        updater: [
                            {
                                target: "sys_world.state.purge_progress.value",
                                op: "ADD",
                                value: 2,
                                triggers: ["cycle_complete"],
                                conditions: [],
                            },
                        ],
                    },
                },
            },
            runtime: {
                getCartridge: () => ({
                    config: {
                        settings: {
                            game_config: {
                                susDisplays: [
                                    {
                                        text: "Risky",
                                        color: "#ff0000",
                                        threshold: 1,
                                    },
                                ],
                            },
                        },
                    },
                    blueprints: {
                        bp_notice: makeConditionalActivationFixture().blueprint,
                    },
                }),
            },
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
        expect(screen.queryByText("Trick Accountant")).toBeNull();
        expect(screen.queryByText("Production Dashboard")).toBeNull();
        expect(screen.queryByText("Risky")).toBeNull();
        expect(
            screen.getByTestId("conditional-activation-notice"),
        ).toBeTruthy();
    });
});
