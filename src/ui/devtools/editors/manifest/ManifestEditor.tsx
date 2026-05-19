import React from "react";
import { Button } from "../../../lib/atoms/button";
import { Card } from "../../../lib/atoms/card";
import { ManifestFileRow } from "./ManifestFileRow";
import { ManifestEditorControls } from "./ManifestEditorControls";
import { useManifestEditorController } from "./useManifestEditorController";
import { EditorRoot } from "./ManifestEditor.styles";

interface ManifestEditorProps {
    filename: string;
}

export const ManifestEditor: React.FC<ManifestEditorProps> = ({ filename }) => {
    const vm = useManifestEditorController(filename);

    if (vm.isLoading) return <div>Loading manifest...</div>;
    if (vm.error) return <div>{vm.error}</div>;
    if (!vm.draft) return <div>Manifest not found.</div>;

    return (
        <EditorRoot>
            <Card variant="surface" padding="md">
                <ManifestEditorControls
                    name={vm.draft.name}
                    addSelection={vm.addSelection}
                    remaining={vm.remaining}
                    onNameChange={vm.onNameChange}
                    onAddSelectionChange={vm.setAddSelection}
                    onAdd={vm.onAdd}
                />
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void vm.handleAutoImport()}
                >
                    Auto-Import All
                </Button>
                {vm.draft.files.map((file) => (
                    <ManifestFileRow
                        key={file}
                        file={file}
                        selected={vm.selected === file}
                        onSelect={() => vm.setSelected(file)}
                        onOpen={() => vm.onOpen(file)}
                        onDelete={() => vm.onDelete(file)}
                        onDragStart={() => vm.setDragging(file)}
                        onDrop={() => vm.onDrop(file)}
                    />
                ))}
            </Card>
        </EditorRoot>
    );
};
