import React from "react";
import { createRuntimeTestDouble } from "../testUtils";
import { usePointerBodySelector } from "./usePointerBodySelector";

export const makeBody = (id: string, traits: string[] = []) => ({
    id,
    body: { traits, attributes: { body: 1, mind: 0, social: 0 } },
});

export const makeRuntime = (entities: any[]) =>
    createRuntimeTestDouble({
        getEntities: () => entities,
        getEntity: (id: string) =>
            entities.find((entity) => entity.id === id) ?? null,
    }).runtime as any;

export const Harness: React.FC<{
    runtime: any;
    candidateIds: string[];
    targetEntity: any;
}> = ({ runtime, candidateIds, targetEntity }) => {
    const controller = usePointerBodySelector(
        runtime,
        candidateIds,
        "processing",
        targetEntity,
    );

    return (
        <div data-testid="root" onMouseUp={controller.onListMouseUp}>
            <div data-testid="candidates">
                {controller.candidateIds.join(",")}
            </div>
            <div data-testid="selected">
                {Array.from(controller.selectedIds).join(",")}
            </div>
            <button data-testid="confirm" disabled={!controller.canConfirm} />
            {controller.candidateIds.map((id) => (
                <button
                    key={id}
                    data-testid={`candidate-${id}`}
                    data-entity-id={id}
                    onMouseDown={controller.onListMouseDown}
                    onMouseOver={controller.onListMouseOver}
                    onFocus={() => undefined}
                >
                    {id}
                </button>
            ))}
        </div>
    );
};
