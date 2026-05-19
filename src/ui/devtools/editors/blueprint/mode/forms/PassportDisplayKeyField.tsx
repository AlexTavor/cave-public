import React, { useState } from "react";
import { Modal } from "../../../../../lib/atoms/modal";
import { Card } from "../../../../../lib/atoms/card";
import { Button } from "../../../../../lib/atoms/button";
import { GameIcon } from "../../../../../lib/atoms/game-icon";
import { useSessionStore } from "../../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../../utils/objectUtils";
import { FieldContainer, Label } from "../../../fields/Shared.styles";
import { CreateAssetModal } from "../../../assets/create-asset-modal/CreateAssetModal";
import {
    GridContainer,
    IconOption,
    ModalFooter,
    ModalHeader,
    PickerTrigger,
    SearchInput,
} from "../../../fields/icon-picker/IconPicker.styles";
import { usePassportDisplayKeys } from "./usePassportDisplayKeys";

export const PassportDisplayKeyField: React.FC<{
    filename: string;
    path: string;
    label: string;
    tooltip?: string;
}> = ({ filename, path, label, tooltip }) => {
    const value = useSessionStore((state) => {
        const draft = state.sessions[filename]?.draft;
        return draft ? (getByPath(draft, path) as string) || "" : "";
    });
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const [isOpen, setIsOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [search, setSearch] = useState("");
    const { assetFilename, displayKeys } = usePassportDisplayKeys(
        filename,
        value,
    );
    const filteredKeys = displayKeys.filter(
        (key) =>
            !search.trim() ||
            key.toLowerCase().includes(search.trim().toLowerCase()),
    );
    const handleSelect = (key: string) => {
        updateDraft(filename, (draft) => setByPath(draft, path, key));
        setIsOpen(false);
    };

    return (
        <FieldContainer>
            <Label title={tooltip}>{label}</Label>
            <PickerTrigger
                role="button"
                title="Choose which authored display key this passport uses."
                onClick={() => setIsOpen(true)}
            >
                {value ? <GameIcon id={value} /> : <span>None</span>}
                <span style={{ fontFamily: "monospace", marginLeft: "auto" }}>
                    {value || "Select Display..."}
                </span>
            </PickerTrigger>
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <Card>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <ModalHeader>Select Display</ModalHeader>
                        <SearchInput
                            autoFocus
                            placeholder="Search displays..."
                            title="Filter the available authored display keys."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <GridContainer>
                            {filteredKeys.map((key) => (
                                <IconOption
                                    key={key}
                                    isSelected={key === value}
                                    title={key}
                                    onClick={() => handleSelect(key)}
                                >
                                    <GameIcon id={key} />
                                </IconOption>
                            ))}
                        </GridContainer>
                        <ModalFooter>
                            {!filteredKeys.length && search.trim() ? (
                                <Button
                                    title="Create a new display asset with this id."
                                    variant="primary"
                                    onClick={() => setIsCreateOpen(true)}
                                >
                                    Create '{search}'
                                </Button>
                            ) : null}
                            <Button
                                title="Close the display key picker without changing the value."
                                onClick={() => setIsOpen(false)}
                            >
                                Cancel
                            </Button>
                        </ModalFooter>
                    </div>
                </Card>
            </Modal>
            {isCreateOpen ? (
                <CreateAssetModal
                    isOpen={true}
                    filename={assetFilename}
                    initialId={search}
                    onClose={() => setIsCreateOpen(false)}
                    onCreated={(nextId) => {
                        handleSelect(nextId);
                        setIsCreateOpen(false);
                    }}
                />
            ) : null}
        </FieldContainer>
    );
};
