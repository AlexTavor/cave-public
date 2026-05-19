import React from "react";
import { z } from "zod";
import { EnumField } from "../fields/enum-field/EnumField";
import { NumberField } from "../fields/number-field/NumberField";
import { AutocompleteStringField } from "../fields/string-field/AutocompleteStringField";
import {
    FactScopeSchema,
    FactTypeSchema,
    StructuredConditionOperatorSchema,
} from "../../../../data/schemas/conditions";
import {
    resolveStructuredFactAboutSuggestions,
    STRUCTURED_WORLD_STATE_KEYS,
} from "./structuredConditionAutocomplete";

const stringSchema = z.string();
const numberSchema = z.number();

type SharedProps = { filename: string; basePath: string };

export const WorldStateThresholdFields: React.FC<SharedProps> = ({
    filename,
    basePath,
}) => (
    <>
        <AutocompleteStringField
            label="State Key"
            schema={stringSchema}
            filename={filename}
            path={`${basePath}.key`}
            suggestions={STRUCTURED_WORLD_STATE_KEYS}
        />
        <EnumField
            label="Operator"
            schema={StructuredConditionOperatorSchema}
            filename={filename}
            path={`${basePath}.operator`}
        />
        <NumberField
            label="Value"
            schema={numberSchema}
            filename={filename}
            path={`${basePath}.value`}
        />
    </>
);

export const FactThresholdFields: React.FC<
    SharedProps & {
        factType: string;
        blueprintIds: string[];
        tutorialIds: string[];
        draftOptionIds: string[];
        draftPoolIds: string[];
        understandingIds: string[];
    }
> = ({
    filename,
    basePath,
    factType,
    blueprintIds,
    tutorialIds,
    draftOptionIds,
    draftPoolIds,
    understandingIds,
}) => (
    <>
        <EnumField
            label="Scope"
            schema={FactScopeSchema}
            filename={filename}
            path={`${basePath}.scope`}
        />
        <EnumField
            label="Fact Type"
            schema={FactTypeSchema}
            filename={filename}
            path={`${basePath}.factType`}
        />
        <AutocompleteStringField
            label="About"
            schema={stringSchema}
            filename={filename}
            path={`${basePath}.factAbout`}
            suggestions={resolveStructuredFactAboutSuggestions(
                factType,
                blueprintIds,
                tutorialIds,
                draftOptionIds,
                draftPoolIds,
                understandingIds,
            )}
        />
        <EnumField
            label="Operator"
            schema={StructuredConditionOperatorSchema}
            filename={filename}
            path={`${basePath}.operator`}
        />
        <NumberField
            label="Value"
            schema={numberSchema}
            filename={filename}
            path={`${basePath}.value`}
        />
    </>
);
