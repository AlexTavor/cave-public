import React from "react";
import { z } from "zod";
import { BooleanField } from "../fields/boolean-field/BooleanField";
import { EnumField } from "../fields/enum-field/EnumField";
import { AutocompleteStringField } from "../fields/string-field/AutocompleteStringField";
import { UserInteractionStateSchema } from "../../../../data/schemas/conditions";
import { STRUCTURED_WORLD_STATE_KEYS } from "./structuredConditionAutocomplete";

type SharedProps = { filename: string; basePath: string };

export const EntityTagPresentFields: React.FC<
    SharedProps & { tagSuggestions: string[] }
> = ({ filename, basePath, tagSuggestions }) => (
    <AutocompleteStringField
        label="Tag"
        schema={z.string()}
        filename={filename}
        path={`${basePath}.tag`}
        suggestions={tagSuggestions}
    />
);

export const WorldStateBooleanFields: React.FC<SharedProps> = ({
    filename,
    basePath,
}) => (
    <>
        <AutocompleteStringField
            label="State Key"
            schema={z.string()}
            filename={filename}
            path={`${basePath}.key`}
            suggestions={STRUCTURED_WORLD_STATE_KEYS}
        />
        <BooleanField
            label="Value"
            schema={z.boolean()}
            filename={filename}
            path={`${basePath}.value`}
        />
    </>
);

export const UserInteractionFields: React.FC<SharedProps> = ({
    filename,
    basePath,
}) => (
    <EnumField
        label="Interaction"
        schema={UserInteractionStateSchema}
        filename={filename}
        path={`${basePath}.interaction`}
    />
);

export const BodiesAssignedFields: React.FC = () => (
    <div>
        Uses the resolved self entity. True when self has at least one assigned
        body.
    </div>
);

export const BodyInPointerFields: React.FC = () => (
    <div>
        True when sys_pointer currently carries at least one assigned body.
    </div>
);

export const CarriersOrbitingFields: React.FC = () => (
    <div>
        True when at least one live carrier has arrived and now orbits cave.
    </div>
);

export const DestructiveAssignmentHasAllBodiesFields: React.FC = () => (
    <div>
        Uses the resolved self entity. True only when self destroys assigned
        bodies and currently holds every extant non-aggregate body.
    </div>
);
