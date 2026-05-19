import React from "react";
import { renderSchemaField } from "../schemaFieldProxy";
import * as S from "./ObjectField.styles";
import { ZodType } from "zod";

interface ObjectFieldItemProps {
  propKey: string;
  schema: ZodType;
  childPath: string;
  filename: string;
  isOptionalField: boolean;
  onRemove: () => void;
}

export const ObjectFieldItem: React.FC<ObjectFieldItemProps> = ({
  propKey,
  schema,
  childPath,
  filename,
  isOptionalField,
  onRemove,
}) => {
  const field = (
    <>
      {renderSchemaField({
        label: propKey,
        schema,
        filename,
        path: childPath,
      })}
    </>
  );

  if (isOptionalField) {
    return (
      <S.OptionalFieldWrapper>
        <div style={{ flex: 1, minWidth: 0 }}>{field}</div>
        <div className="delete-btn">
          <S.DeleteButton onClick={onRemove} title="Remove field">
            🗑️
          </S.DeleteButton>
        </div>
      </S.OptionalFieldWrapper>
    );
  }

  return <>{field}</>;
};
