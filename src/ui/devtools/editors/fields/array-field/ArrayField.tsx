import React from "react";
import { ArrayItem, FieldContainer } from "../../SchemaForm.styles";
import { FieldProps } from "../Shared.types";
import { renderSchemaField } from "../schemaFieldProxy";
import { Button } from "../../../../lib/atoms/button/Button";
import { useArrayField } from "./useArrayField";
import {
  Header,
  HeaderClickable,
  ItemsContainer,
  ItemWrapper,
  ToggleIcon,
} from "./ArrayField.styles";

export const ArrayField: React.FC<FieldProps> = ({
  label,
  schema,
  filename,
  path,
}) => {
  const { items, isOpen, toggle, add, remove, itemSchema } = useArrayField(
    filename,
    path,
    schema,
  );

  return (
    <FieldContainer>
      <Header>
        <HeaderClickable
          onClick={toggle}
          onKeyDown={(e) => e.key === "Enter" && toggle()}
          role="button"
          tabIndex={0}
        >
          <ToggleIcon isOpen={isOpen}>▶</ToggleIcon>
          <span>
            {label} [{items.length}]
          </span>
        </HeaderClickable>
        <Button variant="ghost" size="sm" onClick={add}>
          + Add
        </Button>
      </Header>
      {isOpen && (
        <ItemsContainer>
          {items.map((_, index) => {
            const childPath = path ? `${path}.${index}` : `${index}`;
            return (
              <ArrayItem key={`${filename}-${childPath}`}>
                <ItemWrapper>
                  {renderSchemaField({
                    label: `${index + 1}`,
                    schema: itemSchema,
                    filename,
                    path: childPath,
                  })}
                </ItemWrapper>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => remove(index)}
                  title="Remove item"
                >
                  ×
                </Button>
              </ArrayItem>
            );
          })}
        </ItemsContainer>
      )}
    </FieldContainer>
  );
};
