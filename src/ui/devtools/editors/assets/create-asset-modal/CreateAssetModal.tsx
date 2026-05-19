import React from "react";
import { Modal } from "../../../../lib/atoms/modal";
import { Card } from "../../../../lib/atoms/card";
import { Button } from "../../../../lib/atoms/button";
import {
    Body,
    ErrorText,
    Field,
    Input,
    Label,
    Select,
    Title,
} from "../../fields/icon-asset-editor/IconAssetEditorModal.styles";
import { ActionsRow, HelperText } from "./CreateAssetModal.styles";
import type { ModuleDisplayAsset } from "../../../state/moduleStore.assets";
import { useCreateDisplayAssetModal } from "./useCreateDisplayAssetModal";

export interface CreateAssetModalProps {
    isOpen: boolean;
    filename: string;
    onClose: () => void;
    onCreated?: (assetId: string) => void;
    initialId?: string;
}

export const CreateAssetModal: React.FC<CreateAssetModalProps> = (props) => {
    const { isOpen, onClose, filename, onCreated, initialId } = props;
    const state = useCreateDisplayAssetModal({
        isOpen,
        onClose,
        filename,
        onCreated,
        initialId,
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <Card>
                <Body>
                    <Title>Create Display</Title>

                    {state.error && <ErrorText>{state.error}</ErrorText>}

                    <Field>
                        <Label>ID</Label>
                        <Input
                            value={state.idValue}
                            onChange={(e) => state.setIdValue(e.target.value)}
                            placeholder="e.g. wraith"
                        />
                    </Field>

                    <Field>
                        <Label>Type</Label>
                        <Select
                            value={state.typeValue}
                            onChange={(e) =>
                                state.setTypeValue(
                                    e.target
                                        .value as ModuleDisplayAsset["type"],
                                )
                            }
                        >
                            <option value="resource">Resource</option>
                            <option value="attribute_pool">
                                Attribute Pool
                            </option>
                            <option value="body">Body</option>
                        </Select>
                    </Field>

                    <HelperText>
                        A placeholder display will be created and opened in the
                        custom display editor.
                    </HelperText>

                    <ActionsRow>
                        <Button size="sm" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            variant="primary"
                            onClick={state.handleCreate}
                            disabled={state.saving}
                        >
                            {state.saving ? "Creating..." : "Create"}
                        </Button>
                    </ActionsRow>
                </Body>
            </Card>
        </Modal>
    );
};

