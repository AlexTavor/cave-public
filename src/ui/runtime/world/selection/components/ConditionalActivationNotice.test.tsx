// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
    makeConditionalActivationFixture,
    renderSelectionCard,
} from "../conditionalActivationTestUtils";
import { ConditionalActivationNotice } from "./ConditionalActivationNotice";

afterEach(cleanup);

describe("ConditionalActivationNotice", () => {
    it("renders authored explanation when the resolver conditions are satisfied", () => {
        const { entity, runtime } = makeConditionalActivationFixture();
        renderSelectionCard(
            <ConditionalActivationNotice
                entityId={entity.id}
                runtime={runtime}
            />,
        );
        expect(
            screen.getByTestId("conditional-activation-notice"),
        ).toBeTruthy();
        expect(screen.getByText("Needs power.")).toBeTruthy();
    });

    it("renders nothing when the entity is active", () => {
        const { entity, runtime } = makeConditionalActivationFixture({
            active: true,
        });
        renderSelectionCard(
            <ConditionalActivationNotice
                entityId={entity.id}
                runtime={runtime}
            />,
        );
        expect(
            screen.queryByTestId("conditional-activation-notice"),
        ).toBeNull();
    });

    it("renders the highest-priority failing explanation", () => {
        const { entity, runtime } = makeConditionalActivationFixture({
            conditionalActivation: [
                {
                    priority: 0,
                    conditions: [],
                    targets: [{ ability: "cycle" }],
                    inactiveExplanation: "Fallback.",
                },
                {
                    priority: 2,
                    conditions: [],
                    targets: [{ ability: "cycle" }],
                    inactiveExplanation: "Priority winner.",
                },
            ],
        });
        renderSelectionCard(
            <ConditionalActivationNotice
                entityId={entity.id}
                runtime={runtime}
            />,
        );
        expect(screen.getByText("Priority winner.")).toBeTruthy();
    });
});
