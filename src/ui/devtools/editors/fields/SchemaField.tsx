import React from "react";
import { FieldProps } from "./Shared.types";
import { getZodType } from "../utils";
import { BooleanField } from "./boolean-field/BooleanField";
import { EnumField } from "./enum-field/EnumField";
import { ArrayField } from "./array-field/ArrayField";
import { ObjectField } from "./object-field/ObjectField";
import { RecordField } from "./record-field";
import { UnionField } from "./union-field";
import { StructuredSentenceInput } from "../logic/StructuredSentenceInput";
import { BodyField } from "./body-field/BodyField";
import { parseTooltip } from "./tooltipMeta";
import { renderNumberField, renderStringField } from "./schemaFieldRenderers";
import { BodyAbilitySchema } from "../../../../data/schemas/abilities/body";
import { registerSchemaFieldRenderer } from "./schemaFieldProxy";

export const SchemaField: React.FC<FieldProps> = (props) => {
  const { schema } = props;
  const type = getZodType(schema);

  const description = schema.description;
  const tooltip = parseTooltip(description);
  const fieldProps = { ...props, tooltip };

  if (schema === BodyAbilitySchema) {
    return (
      <BodyField
        label={props.label}
        filename={props.filename}
        path={props.path}
        schema={props.schema}
      />
    );
  }

  if (description) {
    if (description.includes("ui:hidden")) {
      return null;
    }
    if (description.includes("ui:logic-rule")) {
      return <StructuredSentenceInput {...props} />;
    }
  }

  switch (type) {
    case "string":
      return renderStringField(props, fieldProps, description);
    case "number":
      return renderNumberField(fieldProps, description);
    case "boolean":
      return <BooleanField {...fieldProps} />;
    case "enum":
      return <EnumField {...props} />;
    case "array":
      return <ArrayField {...props} />;
    case "object":
      return <ObjectField {...fieldProps} />;
    case "record":
      return <RecordField {...props} />;
    case "union":
      return <UnionField {...props} />;
    default:
      return (
        <div
          style={{
            color: "#888",
            fontSize: "10px",
            padding: "4px",
            fontStyle: "italic",
          }}
        >
          Unsupported type: {type} for {props.label}
        </div>
      );
  }
};

registerSchemaFieldRenderer((props) => React.createElement(SchemaField, props));
