import React from "react";
import { FieldContainer, Input } from "../../SchemaForm.styles";
import { FieldProps } from "../Shared.types";
import { renderSchemaField } from "../schemaFieldProxy";
import { Button } from "../../../../lib/atoms/button/Button";
import * as S from "./RecordField.styles";
import { useRecordField } from "./useRecordField";

export const RecordField: React.FC<FieldProps> = ({
  label,
  schema,
  filename,
  path,
}) => {
  const { data, addKey, setAddKey, handleAdd, handleRemove, valueSchema } =
    useRecordField(filename, path, schema);

  const keys = Object.keys(data);

  return (
    <FieldContainer>
      <S.Header>
        <span>
          {label} [{keys.length}]
        </span>
      </S.Header>
      <S.Entries>
        {keys.length === 0 ? (
          <S.EmptyState>No entries yet.</S.EmptyState>
        ) : (
          keys.map((key) => {
            const childPath = path ? `${path}.${key}` : key;
            return (
              <S.EntryRow key={key}>
                <S.EntryBody>
                  {renderSchemaField({
                    label: key,
                    schema: valueSchema,
                    filename,
                    path: childPath,
                  })}
                </S.EntryBody>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemove(key)}
                  title="Remove entry"
                >
                  ×
                </Button>
              </S.EntryRow>
            );
          })
        )}
      </S.Entries>
      <S.AddRow>
        <Input
          placeholder="New key"
          value={addKey}
          onChange={(event) => setAddKey(event.target.value)}
        />
        <Button
          variant="ghost"
          size="sm"
          disabled={!addKey.trim()}
          onClick={() => handleAdd(addKey)}
        >
          Add
        </Button>
      </S.AddRow>
    </FieldContainer>
  );
};
