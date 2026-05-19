// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BodyCard } from "./body/BodyCard";
import {
    makeConditionalActivationFixture,
    renderSelectionCard,
} from "./conditionalActivationTestUtils";

afterEach(cleanup);

describe("conditional activation passport body card", () => {
    it("hides passport title and description when passport is inactive", () => {
        const body = makeConditionalActivationFixture({
            blueprint: {
                components: {
                    display: {
                        label: "Notice Entity",
                        display_key: "notice",
                        description: "Hidden passport ability.",
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
                    },
                },
            },
            entity: {
                body: {
                    level: 1,
                    xp: 0,
                    health: 5,
                    maxHealth: 10,
                    attributes: { body: 1, mind: 1, social: 1 },
                    passport: { name: "Alden" },
                },
            },
        });
        renderSelectionCard(
            <BodyCard entity={body.entity} runtime={body.runtime} />,
        );
        expect(screen.queryByText("Alden")).toBeNull();
        expect(screen.queryByText("Hidden passport ability.")).toBeNull();
        expect(
            screen.getByTestId("conditional-activation-notice"),
        ).toBeTruthy();
    });
});
