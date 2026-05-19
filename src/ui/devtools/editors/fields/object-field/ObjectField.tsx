import React from "react";
import { FieldContainer, Label } from "../../SchemaForm.styles";
import { FieldProps } from "../Shared.types";
import { isOptional, getDefaultValue } from "../../utils";
import { useObjectField } from "./useObjectField";
import * as S from "./ObjectField.styles";
import { ObjectFieldHeader } from "./ObjectFieldHeader";
import { ObjectFieldItem } from "./ObjectFieldItem";

export const ObjectField: React.FC<FieldProps> = ({
    label,
    schema,
    filename,
    path,
    tooltip,
}) => {
    const {
        data,
        shape,
        isCollapsible,
        isOpen,
        toggleOpen,
        handleAdd,
        handleRemove,
    } = useObjectField(filename, path, schema);

    if (!shape) {
        return (
            <div style={{ color: "red" }}>
                Invalid object schema for {label} (missing shape)
            </div>
        );
    }

    const content = (
        <S.ContentWrapper isCollapsible={!!isCollapsible}>
            {Object.keys(shape).map((key) => {
                const fieldSchema = shape[key];

                if (fieldSchema.description?.includes("ui:hidden")) {
                    return null;
                }

                const isFieldOptional = isOptional(fieldSchema);
                // Safe access if data is not an object (though hook ensures it defaults to {})
                const hasValue = data?.[key] !== undefined;

                if (isFieldOptional && !hasValue) {
                    return (
                        <div key={key}>
                            <S.ActionButton
                                onClick={() =>
                                    handleAdd(key, getDefaultValue(fieldSchema))
                                }
                            >
                                + Add {key}
                            </S.ActionButton>
                        </div>
                    );
                }

                const childPath = path ? `${path}.${key}` : key;

                return (
                    <ObjectFieldItem
                        key={key}
                        propKey={key}
                        schema={fieldSchema}
                        childPath={childPath}
                        filename={filename}
                        isOptionalField={!!isFieldOptional}
                        onRemove={() => handleRemove(key)}
                    />
                );
            })}
        </S.ContentWrapper>
    );

    if (isCollapsible) {
        return (
            <FieldContainer>
                <ObjectFieldHeader
                    label={label}
                    isOpen={!!isOpen}
                    onClick={toggleOpen}
                    tooltip={tooltip}
                />
                {isOpen && content}
            </FieldContainer>
        );
    }

    return (
        <FieldContainer>
            <Label
                style={{
                    fontWeight: "bold",
                    color: "#aaa",
                    marginBottom: "8px",
                }}
            >
                {label}
            </Label>
            {content}
        </FieldContainer>
    );
};
