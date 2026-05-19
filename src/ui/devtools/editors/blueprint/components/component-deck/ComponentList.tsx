import React, { useMemo, useCallback } from "react";
import { ComponentRow } from "../../../../../lib/atoms/component-row";
import { SchemaForm } from "../../../SchemaForm";
import { ALL_COMPONENT_KEYS, registry } from "../../registry";
import { useBlueprintActions } from "../../hooks/useBlueprintActions";
import { BehaviorsPanel } from "../../../behaviors/BehaviorsPanel";
import { useBlueprintContext } from "../../BlueprintContext";
import { useBlueprintSlice } from "../../../../state/moduleSession/useBlueprintSlice";
import { useSessionStore } from "../../../../state/useSessionStore";
import type { Blueprint } from "../../../../../../data/schemas/blueprint";

// Stable references to prevent infinite re-renders caused by literal defaults {}
const EMPTY_EXPANSION = {};
const EMPTY_COMPONENTS: Blueprint["components"] = {} as Blueprint["components"];

export const ComponentList: React.FC = () => {
    const { filename, blueprintId, rootPath, scopeId } = useBlueprintContext();
    const actions = useBlueprintActions();

    const blueprint = useBlueprintSlice(filename, blueprintId);
    const components = blueprint?.components ?? EMPTY_COMPONENTS;

    const expandedRows = useSessionStore(
        useCallback(
            (state) =>
                state.sessions[filename]?.ui[scopeId]?.expandedRows ??
                EMPTY_EXPANSION,
            [filename, scopeId],
        ),
    );

    const behaviorCount = components?.behavior?.rules?.length ?? 0;

    // Compute present keys (stable order based on registry definition)
    const presentKeys = useMemo(
        () => ALL_COMPONENT_KEYS.filter((k) => components?.[k] !== undefined),
        [components],
    );

    return (
        <>
            <ComponentRow
                title="Behaviors"
                icon={<span>🧩</span>}
                summary={`${behaviorCount} behaviors`}
                isOpen={expandedRows.behaviors ?? false}
                onToggle={(next) => actions.toggleComponent("behaviors", next)}
            >
                <BehaviorsPanel />
            </ComponentRow>

            {presentKeys.map((key) => {
                const entry = registry[key];
                const isOpen = expandedRows[key] ?? false;
                const component = components[key];

                if (!component) {
                    return null;
                }

                return (
                    <ComponentRow
                        key={key}
                        title={entry.label}
                        icon={entry.icon}
                        summary={entry.summarize(component as any)}
                        isOpen={isOpen}
                        onToggle={(next) => actions.toggleComponent(key, next)}
                        onDelete={() => actions.removeComponent(key)}
                        deleteLabel="Remove"
                    >
                        <SchemaForm
                            schema={entry.schema}
                            filename={filename}
                            rootPath={`${rootPath}.components.${key}`}
                        />
                    </ComponentRow>
                );
            })}
        </>
    );
};
