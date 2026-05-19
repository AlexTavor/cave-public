import { z } from "zod";
import type { AssignmentResultConfig } from "../../../../../../data/schemas/abilities/assignment";
import { Button } from "../../../../../lib/atoms/button";
import { EnumField } from "../../../fields/enum-field/EnumField";
import { NumberField } from "../../../fields/number-field/NumberField";
import { Row, SectionLabel } from "./AssignmentAbilityForm.styles";
import { AutocompleteStringField } from "./atoms/AutocompleteStringField";
import { useResourceSuggestions } from "./useResourceSuggestions";

const sourceSchema = z.enum(["fixed", "attribute", "lifetime_xp"]);
const attributeSchema = z.enum(["body", "mind", "social"]);
const numberSchema = z.number();
const targetSuggestions = ["sys_world", "self"];

interface AssignmentResultRowProps {
    filename: string;
    path: string;
    result: AssignmentResultConfig;
    onDelete: () => void;
}

export function AssignmentResultRow({
    filename,
    path,
    result,
    onDelete,
}: Readonly<AssignmentResultRowProps>) {
    const resourceSuggestions = useResourceSuggestions(filename);
    if (result.type === "destroy_assigned_bodies") {
        return (
            <Row>
                <SectionLabel>Destroy Bodies</SectionLabel>
                <Button size="sm" variant="danger" onClick={onDelete}>
                    Remove
                </Button>
            </Row>
        );
    }
    if (result.type === "transfer_habiti") {
        return (
            <Row>
                <SectionLabel>Transfer Habiti</SectionLabel>
                <Button size="sm" variant="danger" onClick={onDelete}>
                    Remove
                </Button>
            </Row>
        );
    }
    return (
        <Row>
            <SectionLabel>Spawn Resource</SectionLabel>
            <AutocompleteStringField
                label="Resource"
                filename={filename}
                path={`${path}.resource`}
                suggestions={resourceSuggestions}
                tooltip="The resource ID to produce."
            />
            <EnumField
                label="Source"
                schema={sourceSchema}
                filename={filename}
                path={`${path}.source`}
                tooltip="Source: fixed, attribute, or lifetime_xp."
            />
            {result.source === "attribute" ? (
                <EnumField
                    label="Attribute"
                    schema={attributeSchema}
                    filename={filename}
                    path={`${path}.attribute`}
                    tooltip="Body, Mind, or Social when source is attribute."
                />
            ) : null}
            <NumberField
                label="Factor"
                schema={numberSchema}
                filename={filename}
                path={`${path}.factor`}
                tooltip="Multiplier applied to the source value."
            />
            <AutocompleteStringField
                label="Target"
                filename={filename}
                path={`${path}.target`}
                suggestions={targetSuggestions}
                tooltip="Destination: 'sys_world' or 'self'."
            />
            <Button size="sm" variant="danger" onClick={onDelete}>
                Remove
            </Button>
        </Row>
    );
}
