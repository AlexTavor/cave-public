import { useState } from "react";
import { Modal } from "../../lib/atoms/modal/Modal";
import { Button } from "../../lib/atoms/button";
import { SaveSlotCard } from "./SaveSlotCard";
import { DialogBody, DialogInput, SlotList } from "./SaveMenuDialog.styles";

export interface SaveMenuDialogProps {
    mode: "save" | "load";
    isOpen: boolean;
    availableSaves: string[];
    currentSaveName: string | null;
    canSave: boolean;
    onClose: () => void;
    onSaveAs: (name: string) => Promise<void> | void;
    onLoad: (name: string) => Promise<void> | void;
    onDelete: (name: string) => Promise<void> | void;
}

export const SaveMenuDialog = (props: SaveMenuDialogProps) => {
    const [name, setName] = useState("");
    return (
        <Modal isOpen={props.isOpen} onClose={props.onClose}>
            <DialogBody>
                <h2>{props.mode === "save" ? "Save Game" : "Load Game"}</h2>
                {props.mode === "save" ? (
                    <>
                        <DialogInput
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Save name"
                            value={name}
                        />
                        <Button
                            disabled={!props.canSave || !name.trim()}
                            onClick={() => props.onSaveAs(name.trim())}
                            type="button"
                        >
                            Save As
                        </Button>
                    </>
                ) : null}
                <SlotList>
                    {props.availableSaves.map((slot) => (
                        <SaveSlotCard
                            key={slot}
                            isCurrent={slot === props.currentSaveName}
                            mode={props.mode}
                            name={slot}
                            onDelete={() => props.onDelete(slot)}
                            onSelect={() =>
                                props.mode === "save"
                                    ? props.onSaveAs(slot)
                                    : props.onLoad(slot)
                            }
                        />
                    ))}
                </SlotList>
            </DialogBody>
        </Modal>
    );
};
