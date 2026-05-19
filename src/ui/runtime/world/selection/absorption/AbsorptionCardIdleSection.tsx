import React from "react";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { Button } from "../../../../lib/atoms/button";
import { Modal } from "../../../../lib/atoms/modal";
import { StorageAbilityDisplay } from "../ability-display/StorageAbilityDisplay";
import type { AssignmentJobCardData } from "../job-card/jobCardTypes";
import { AssignmentRequirementsSection } from "./AssignmentRequirementsSection";
import { ActionRow, StorageRow } from "./AbsorptionCard.styles";
import { BodySelector } from "./BodySelector";

type Props = {
    data: AssignmentJobCardData;
    entity: RuntimeEntity;
    runtime: Runtime;
    onOpenSelector: () => void;
    onCloseSelector: () => void;
    onConfirmBodies: (ids: string[]) => void;
    onCancelSelector: () => void;
};

export const AbsorptionCardIdleSection: React.FC<Props> = ({
    data,
    entity,
    runtime,
    onOpenSelector,
    onCloseSelector,
    onConfirmBodies,
    onCancelSelector,
}) => {
    const isSelectBodiesDisabled = data.isInactive === true;
    if (data.isDepleted || data.isInactive) return null;
    return (
        <>
            <AssignmentRequirementsSection
                filterLabels={data.requirements.filterLabels}
                minimumRows={data.requirements.minimumRows}
            />
            <StorageRow>
                <StorageAbilityDisplay models={data.storageModels} />
            </StorageRow>
            <ActionRow>
                <Button
                    size="lg"
                    variant="primary"
                    disabled={isSelectBodiesDisabled}
                    onClick={onOpenSelector}
                >
                    Select Bodies
                </Button>
            </ActionRow>
            <Modal
                isOpen={!isSelectBodiesDisabled && data.isSelectorOpen}
                onClose={onCloseSelector}
            >
                <BodySelector
                    runtime={runtime}
                    stationEntity={entity}
                    onConfirm={onConfirmBodies}
                    onCancel={onCancelSelector}
                />
            </Modal>
        </>
    );
};
