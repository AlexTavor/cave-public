import React from "react";
import { Button } from "../../../lib/atoms/button";
import { Field, Input, Label, Row, Select } from "./ManifestEditor.styles";

interface ManifestEditorControlsProps {
    name: string;
    addSelection: string;
    remaining: string[];
    onNameChange: (value: string) => void;
    onAddSelectionChange: (value: string) => void;
    onAdd: () => void;
}

export const ManifestEditorControls: React.FC<ManifestEditorControlsProps> = ({
    name,
    addSelection,
    remaining,
    onNameChange,
    onAddSelectionChange,
    onAdd,
}) => (
    <>
        <Field>
            <Label htmlFor="manifest-project-name">Project Name</Label>
            <Input
                id="manifest-project-name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
            />
        </Field>
        <Row>
            <Field>
                <Label htmlFor="manifest-add-file">Add File</Label>
                <Select
                    id="manifest-add-file"
                    value={addSelection}
                    onChange={(e) => onAddSelectionChange(e.target.value)}
                >
                    <option value="">Add file…</option>
                    {remaining.map((file) => (
                        <option key={file} value={file}>
                            {file}
                        </option>
                    ))}
                </Select>
            </Field>
            <Button
                size="sm"
                variant="ghost"
                disabled={!addSelection}
                onClick={onAdd}
            >
                Add
            </Button>
        </Row>
    </>
);
