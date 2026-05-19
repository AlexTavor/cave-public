import React, { useMemo, useState } from "react";
import { Button } from "../../../../lib/atoms/button";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import { SchemaForm } from "../../SchemaForm";
import { useBlueprintActions } from "../hooks/useBlueprintActions";
import { useBlueprintContext } from "../BlueprintContext";
import { useBlueprintSlice } from "../../../state/moduleSession/useBlueprintSlice";
import { ALL_COMPONENT_KEYS, registry, type ComponentKey } from "../registry";

const MANUAL_COMPONENTS = ALL_COMPONENT_KEYS.filter((key) => key !== "state");

export const AssemblyDeck: React.FC = () => {
    const { filename, blueprintId, rootPath } = useBlueprintContext();
    const actions = useBlueprintActions();
    const components =
        useBlueprintSlice(filename, blueprintId)?.components ?? {};
    const [selection, setSelection] = useState<ComponentKey>(
        MANUAL_COMPONENTS[0],
    );

    const present = useMemo(
        () => MANUAL_COMPONENTS.filter((key) => components[key] !== undefined),
        [components],
    );
    const addable = useMemo(
        () => MANUAL_COMPONENTS.filter((key) => components[key] === undefined),
        [components],
    );

    return (
        <div>
            <div>
                <select
                    value={selection}
                    onChange={(e) =>
                        setSelection(e.target.value as ComponentKey)
                    }
                >
                    {addable.map((key) => (
                        <option key={key} value={key}>
                            {registry[key].label}
                        </option>
                    ))}
                </select>
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={!addable.length}
                    onClick={() => actions.addComponent(selection)}
                >
                    Add Component
                </Button>
            </div>

            {present.map((key) => (
                <ComponentRow
                    key={key}
                    title={registry[key].label}
                    icon={registry[key].icon}
                    summary={registry[key].summarize(components[key] as never)}
                    isOpen
                    onToggle={() => undefined}
                    onDelete={() => actions.removeComponent(key)}
                    deleteLabel="Remove"
                >
                    <SchemaForm
                        schema={registry[key].schema}
                        filename={filename}
                        rootPath={`${rootPath}.components.${key}`}
                    />
                </ComponentRow>
            ))}
        </div>
    );
};
