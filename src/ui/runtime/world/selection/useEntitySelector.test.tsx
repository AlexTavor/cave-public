// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createRuntimeTestDouble } from "../testUtils";
import { useEntitySelector } from "./useEntitySelector";

const SelectorProbe = ({
    runtime,
    entityId,
}: {
    runtime: any;
    entityId?: string;
}) => {
    const value = useEntitySelector(
        runtime,
        entityId,
        (entity) => entity.state.value.value,
    );
    return <div>{value === undefined ? "none" : String(value)}</div>;
};

describe("useEntitySelector", () => {
    it("updates selected values after tracked entity mutations", async () => {
        const entity = { state: { value: { value: 3 } } };
        const runtimeDouble = createRuntimeTestDouble({
            getEntity: () => entity,
        });
        render(<SelectorProbe runtime={runtimeDouble.runtime} entityId="e1" />);
        expect(screen.getByText("3")).toBeTruthy();

        await act(async () => {
            entity.state.value.value = 9;
            runtimeDouble.emitMutation({
                changedEntityIds: ["e1"],
                entityListChanged: false,
                blueprintChanged: false,
            });
        });

        expect(screen.getByText("9")).toBeTruthy();
    });

    it("returns undefined when runtime or entity id is missing", () => {
        render(<SelectorProbe runtime={null} />);
        expect(screen.getByText("none")).toBeTruthy();
    });
});
