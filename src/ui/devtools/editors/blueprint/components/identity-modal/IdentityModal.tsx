import React from "react";
import { Modal } from "../../../../../lib/atoms/modal";
import { Button } from "../../../../../lib/atoms/button";
import { useIdentityModal } from "./useIdentityModal";
import { ErrorText, Footer } from "./IdentityModal.styles";
import {
    Input,
    ModalBody,
    ModalTitle,
    FieldLabel,
} from "../../editor/BlueprintEditor.styles";
import { TagsRow, Tag } from "../../passport/Passport.styles";
import { AddRow } from "../component-deck/ComponentDeck.styles";

export const IdentityModal: React.FC = () => {
    const {
        isOpen,
        draft,
        blueprintId,
        tagDraft,
        setTagDraft,
        validationError,
        close,
        updateLabel,
        addTag,
        removeTag,
    } = useIdentityModal();

    if (!draft) return null;

    return (
        <Modal isOpen={isOpen} onClose={close}>
            <ModalBody>
                <ModalTitle>Identity</ModalTitle>

                <div>
                    <FieldLabel>ID (key)</FieldLabel>
                    <Input value={blueprintId} disabled />
                </div>

                <div>
                    <FieldLabel>Label</FieldLabel>
                    <Input
                        value={draft.label ?? ""}
                        onChange={(e) => updateLabel(e.target.value)}
                        placeholder="e.g. Wooden Chest"
                    />
                    {validationError && (
                        <ErrorText>{validationError}</ErrorText>
                    )}
                </div>

                <div>
                    <FieldLabel>Tags</FieldLabel>
                    <TagsRow style={{ marginTop: 8 }}>
                        {(draft.tags ?? []).map((t: string) => (
                            <Tag
                                key={t}
                                style={{ cursor: "pointer" }}
                                onClick={() => removeTag(t)}
                                title="Click to remove"
                            >
                                {t}
                            </Tag>
                        ))}
                        {!(draft.tags ?? []).length && <Tag>No tags</Tag>}
                    </TagsRow>

                    <AddRow>
                        <Input
                            value={tagDraft}
                            onChange={(e) => setTagDraft(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addTag()}
                            placeholder="Add tag"
                        />
                        <Button
                            size="sm"
                            variant="ghost"
                            disabled={!tagDraft}
                            onClick={addTag}
                        >
                            Add tag
                        </Button>
                    </AddRow>
                </div>

                <Footer>
                    <Button size="sm" variant="ghost" onClick={close}>
                        Done
                    </Button>
                </Footer>
            </ModalBody>
        </Modal>
    );
};
