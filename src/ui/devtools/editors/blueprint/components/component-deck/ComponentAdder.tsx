import React, { useState, useMemo } from "react";
import { Card } from "../../../../../lib/atoms/card";
import { Button } from "../../../../../lib/atoms/button";
import { ALL_COMPONENT_KEYS, ComponentKey, registry } from "../../registry";
import { AddRow, Select } from "./ComponentDeck.styles";
import { useBlueprintActions } from "../../hooks/useBlueprintActions";
import { useBlueprintContext } from "../../BlueprintContext";
import { useBlueprintSlice } from "../../../../state/moduleSession/useBlueprintSlice";

export const ComponentAdder: React.FC = () => {
    const { filename, blueprintId } = useBlueprintContext();
    const actions = useBlueprintActions();

    // Local UI state for the dropdown selection
    const [addKey, setAddKey] = useState<ComponentKey | "">("");

    // Subscribe to draft components to calculate missing keys
    const components = useBlueprintSlice(filename, blueprintId)?.components;

    const missingKeys = useMemo(
        () => ALL_COMPONENT_KEYS.filter((k) => components?.[k] === undefined),
        [components],
    );

    const handleAdd = () => {
        if (!addKey) return;
        actions.addComponent(addKey);
        setAddKey("");
    };

    return (
        <Card padding="md" variant="surface">
            <AddRow>
                <Select
                    value={addKey}
                    onChange={(e) =>
                        setAddKey(e.target.value as ComponentKey | "")
                    }
                    disabled={!missingKeys.length}
                >
                    <option value="">
                        {missingKeys.length
                            ? "Add component…"
                            : "All components added"}
                    </option>
                    {missingKeys.map((k) => (
                        <option key={k} value={k}>
                            {registry[k].label}
                        </option>
                    ))}
                </Select>
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={!addKey}
                    onClick={handleAdd}
                >
                    Add
                </Button>
            </AddRow>
        </Card>
    );
};
