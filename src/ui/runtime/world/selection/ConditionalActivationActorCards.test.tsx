// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BodyCard } from "./body/BodyCard";
import { CaveCard } from "./cave/CaveCard";
import { EntityStateLinkContext } from "../entity-state-link";
import {
    makeConditionalActivationFixture,
    renderSelectionCard,
} from "./conditionalActivationTestUtils";

afterEach(cleanup);

describe("conditional activation actor card wiring", () => {
    it("renders the notice in body and cave cards", () => {
        const body = makeConditionalActivationFixture({
            entity: {
                body: {
                    level: 1,
                    xp: 0,
                    health: 5,
                    maxHealth: 10,
                    attributes: { body: 1, mind: 1, social: 1 },
                    passport: { name: "Alden" },
                },
                display: { description: "A body." },
            },
        });
        renderSelectionCard(
            <BodyCard entity={body.entity} runtime={body.runtime} />,
        );
        expect(
            screen.getByTestId("conditional-activation-notice"),
        ).toBeTruthy();
        cleanup();

        const cave = makeConditionalActivationFixture({
            blueprintId: "sys_world",
            entityId: "sys_world",
            entity: {
                cave: {
                    progression: { level: 1, xp: 0 },
                    attributes: { body: 1, mind: 1, social: 1 },
                },
                state: {
                    conditional_activation_active: { value: 0 },
                    comfort: { value: 1 },
                    population: { value: 1 },
                },
            },
        });
        renderSelectionCard(
            <EntityStateLinkContext.Provider
                value={{
                    register: () => undefined,
                    unregister: () => undefined,
                    registerText: () => undefined,
                    unregisterText: () => undefined,
                }}
            >
                <CaveCard entity={cave.entity} runtime={cave.runtime} />
            </EntityStateLinkContext.Provider>,
        );
        expect(
            screen.getByTestId("conditional-activation-notice"),
        ).toBeTruthy();
    });
});
