import React from "react";
import { Button } from "../../../lib/atoms/button";
import { SmartTooltip } from "../../../lib/atoms/tooltip";
import { EnumField } from "../fields/enum-field/EnumField";
import { getByPath } from "../../../../utils/objectUtils";
import { useSessionStore } from "../../state/useSessionStore";
import {
    structuredConditionKindSchema,
    type StructuredConditionKind,
} from "./structuredConditionKinds";
import { StructuredConditionFieldsByKind } from "./StructuredConditionFieldsByKind";

type StructuredConditionRowProps = {
    filename: string;
    path: string;
    conditionIndex: number;
    onRemove: (index: number) => void;
    onSetKind: (index: number, kind: StructuredConditionKind) => void;
};

export const StructuredConditionRow: React.FC<StructuredConditionRowProps> = ({
    filename,
    path,
    conditionIndex,
    onRemove,
    onSetKind,
}) => {
    const basePath = `${path}.${conditionIndex}`;
    const condition = useSessionStore((state) =>
        getByPath(state.sessions[filename]?.draft, basePath),
    );
    const factType = condition?.factType ?? "elapsed_real_seconds";
    const activeKind = condition?.kind ?? "fact_threshold";
    return (
        <div>
            <EnumField
                label="Kind"
                schema={structuredConditionKindSchema}
                filename={filename}
                path={`${basePath}.kind`}
                onValueChange={(value) =>
                    onSetKind(conditionIndex, value as StructuredConditionKind)
                }
            />
            <SmartTooltip content="Rebuild this row with the default fields for its current kind.">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                        onSetKind(
                            conditionIndex,
                            condition?.kind ?? "fact_threshold",
                        )
                    }
                >
                    Reset Kind Shape
                </Button>
            </SmartTooltip>
            <StructuredConditionFieldsByKind
                filename={filename}
                basePath={basePath}
                kind={activeKind}
                factType={factType}
            />
            <SmartTooltip content="Remove this condition row.">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemove(conditionIndex)}
                >
                    Remove Condition
                </Button>
            </SmartTooltip>
        </div>
    );
};
