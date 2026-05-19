import React from "react";
import { useStructuredConditionSuggestions } from "./structuredConditionAutocomplete";
import {
    FactThresholdFields,
    WorldStateThresholdFields,
} from "./StructuredConditionFieldSets";
import {
    BodyInPointerFields,
    BodiesAssignedFields,
    CarriersOrbitingFields,
    DestructiveAssignmentHasAllBodiesFields,
    EntityTagPresentFields,
    UserInteractionFields,
    WorldStateBooleanFields,
} from "./StructuredConditionSimpleFields";
import type { StructuredConditionKind } from "./structuredConditionKinds";

type Props = {
    filename: string;
    basePath: string;
    kind: StructuredConditionKind;
    factType: string;
};

export const StructuredConditionFieldsByKind: React.FC<Props> = ({
    filename,
    basePath,
    kind,
    factType,
}) => {
    const { tagSuggestions, ...factSuggestions } =
        useStructuredConditionSuggestions(filename);

    if (kind === "world_state_threshold") {
        return (
            <WorldStateThresholdFields
                filename={filename}
                basePath={basePath}
            />
        );
    }
    if (kind === "entity_tag_present") {
        return (
            <EntityTagPresentFields
                filename={filename}
                basePath={basePath}
                tagSuggestions={tagSuggestions}
            />
        );
    }
    if (kind === "world_state_boolean") {
        return (
            <WorldStateBooleanFields filename={filename} basePath={basePath} />
        );
    }
    if (kind === "user_interaction") {
        return (
            <UserInteractionFields filename={filename} basePath={basePath} />
        );
    }
    if (kind === "carriers_orbiting") {
        return <CarriersOrbitingFields />;
    }
    if (kind === "body_in_pointer") {
        return <BodyInPointerFields />;
    }
    if (kind === "bodies_assigned") {
        return <BodiesAssignedFields />;
    }
    if (kind === "destructive_assignment_has_all_bodies") {
        return <DestructiveAssignmentHasAllBodiesFields />;
    }
    return (
        <FactThresholdFields
            filename={filename}
            basePath={basePath}
            factType={factType}
            {...factSuggestions}
        />
    );
};
