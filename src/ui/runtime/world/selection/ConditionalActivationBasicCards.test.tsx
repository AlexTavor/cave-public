// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DisplayCard } from "./DisplayCard";
import { ResourceCard } from "./ResourceCard";
import {
    makeConditionalActivationFixture,
    renderSelectionCard,
} from "./conditionalActivationTestUtils";

afterEach(cleanup);

describe("conditional activation basic card wiring", () => {
    it("renders the notice in display and resource cards", () => {
        const display = makeConditionalActivationFixture();
        renderSelectionCard(
            <DisplayCard entity={display.entity} runtime={display.runtime} />,
        );
        expect(
            screen.getByTestId("conditional-activation-notice"),
        ).toBeTruthy();
        cleanup();

        const resource = makeConditionalActivationFixture({
            entity: { display: { bars: [] } },
        });
        renderSelectionCard(
            <ResourceCard
                entity={resource.entity}
                runtime={resource.runtime}
            />,
        );
        expect(
            screen.getByTestId("conditional-activation-notice"),
        ).toBeTruthy();
    });
});
