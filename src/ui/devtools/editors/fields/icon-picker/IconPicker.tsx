import React from "react";
import { FieldContainer, Label } from "../Shared.styles";
import { FieldProps } from "../Shared.types";
import { Button } from "../../../../lib/atoms/button";
import { Card } from "../../../../lib/atoms/card";
import { GameIcon } from "../../../../lib/atoms/game-icon";
import { Modal } from "../../../../lib/atoms/modal";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { CreateAssetModal } from "../../assets/create-asset-modal/CreateAssetModal";
import { useIconPicker } from "./useIconPicker";
import {
    GridContainer,
    IconOption,
    ModalFooter,
    ModalHeader,
    PickerTrigger,
    SearchInput,
} from "./IconPicker.styles";

export const IconPicker: React.FC<FieldProps> = ({
    label,
    filename,
    path,
    tooltip,
}) => {
    const {
        value,
        assetFilename,
        isOpen,
        setIsOpen,
        search,
        setSearch,
        isCreateOpen,
        setIsCreateOpen,
        iconKeys,
        showCreateCta,
        handleSelect,
        openCreate,
    } = useIconPicker(filename, path);

    return (
        <FieldContainer>
            {tooltip ? (
                <SmartTooltip content={tooltip}>
                    <Label>{label}</Label>
                </SmartTooltip>
            ) : (
                <Label>{label}</Label>
            )}
            <PickerTrigger onClick={() => setIsOpen(true)}>
                {value ? <GameIcon id={value} /> : <span>None</span>}
                <span style={{ fontFamily: "monospace", marginLeft: "auto" }}>
                    {value || "Select Icon..."}
                </span>
            </PickerTrigger>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <Card>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <ModalHeader>Select Display</ModalHeader>
                        <SearchInput
                            placeholder="Search displays..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                        <GridContainer>
                            {iconKeys.map((key) => (
                                <IconOption
                                    key={key}
                                    isSelected={key === value}
                                    onClick={() => handleSelect(key)}
                                    title={key}
                                >
                                    <GameIcon id={key} />
                                </IconOption>
                            ))}
                        </GridContainer>
                        <ModalFooter>
                            {showCreateCta && (
                                <Button onClick={openCreate} variant="primary">
                                    Create '{search}'
                                </Button>
                            )}
                            <Button onClick={() => setIsOpen(false)}>
                                Cancel
                            </Button>
                        </ModalFooter>
                    </div>
                </Card>
            </Modal>

            {isCreateOpen && assetFilename && (
                <CreateAssetModal
                    isOpen={true}
                    onClose={() => setIsCreateOpen(false)}
                    filename={assetFilename}
                    initialId={search}
                    onCreated={(newId: string) => {
                        handleSelect(newId);
                        setIsCreateOpen(false);
                    }}
                />
            )}
        </FieldContainer>
    );
};

