import React from "react";
import { FieldContainer, Label, Select } from "../../SchemaForm.styles";
import { FieldProps } from "../Shared.types";
import { renderSchemaField } from "../schemaFieldProxy";
import { getZodType, unwrapSchema } from "../../utils";
import * as S from "./UnionField.styles";
import { useUnionField } from "./useUnionField";

export const UnionField: React.FC<FieldProps> = ({
  label,
  schema,
  filename,
  path,
}) => {
  const { options, activeOptionIndex, handleTypeChange } = useUnionField(
    filename,
    path,
    schema,
  );

  if (options.length === 0) {
    return (
      <FieldContainer>
        <Label>{label}</Label>
        <S.ErrorText>Union schema has no options.</S.ErrorText>
      </FieldContainer>
    );
  }

  const activeSchema = options[activeOptionIndex] ?? options[0];

  return (
    <FieldContainer>
      <S.HeaderRow>
        <Label>{label}</Label>
        <div>
          <S.TypeLabel>Type</S.TypeLabel>
          <Select
            aria-label="Union type"
            value={String(activeOptionIndex)}
            onChange={(event) => handleTypeChange(Number(event.target.value))}
          >
            {options.map((option, index) => {
              const typeName = getZodType(unwrapSchema(option));
              return (
                <option key={typeName + index} value={index}>
                  {typeName}
                </option>
              );
            })}
          </Select>
        </div>
      </S.HeaderRow>
      <S.Content>
        {renderSchemaField({
          label: "Value",
          schema: activeSchema,
          filename,
          path,
        })}
      </S.Content>
    </FieldContainer>
  );
};
