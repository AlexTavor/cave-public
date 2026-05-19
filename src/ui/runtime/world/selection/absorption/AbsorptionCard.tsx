import React from "react";
import { usePostHog } from "@posthog/react";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { Button } from "../../../../lib/atoms/button";
import { RichText } from "../../../../lib/atoms/rich-text/RichText";
import { StorageAbilityDisplay } from "../ability-display/StorageAbilityDisplay";
import {
    CardHeader,
    CardTitle,
    SelectionCardRoot,
} from "../SelectionCard.styles";
import { ActionRow, StorageRow } from "./AbsorptionCard.styles";
import { AssignmentRequirementsSection } from "./AssignmentRequirementsSection";
import { AbsorptionCardIdleSection } from "./AbsorptionCardIdleSection";
import { ConditionalActivationNotice } from "../components/ConditionalActivationNotice";
import { SelectionTitleRow } from "../components/SelectionTitleRow";
import { SuspiciousActivityIndicator } from "../components/SuspiciousActivityIndicator";
import type { AssignmentJobCardData } from "../job-card/jobCardTypes";

interface AbsorptionCardProps {
    data: AssignmentJobCardData;
    entity: RuntimeEntity;
    runtime: Runtime;
    onRecallBodies: (ids: string[]) => void;
    onOpenSelector: () => void;
    onCloseSelector: () => void;
    onConfirmBodies: (ids: string[]) => void;
    onCancelSelector: () => void;
}

export const AbsorptionCard: React.FC<AbsorptionCardProps> = ({
    data,
    entity,
    runtime,
    onRecallBodies,
    onOpenSelector,
    onCloseSelector,
    onConfirmBodies,
    onCancelSelector,
}) => {
    const posthog = usePostHog();
    const isActive = data.assignedIds.length > 0;

    return (
        <SelectionCardRoot padding="lg" variant="default">
            <CardHeader>
                <SelectionTitleRow
                    title={<CardTitle>{data.label}</CardTitle>}
                    entity={entity}
                    runtime={runtime}
                />
                <SuspiciousActivityIndicator model={data.suspiciousActivity} />
                <RichText variant="narration" text={data.description} />
            </CardHeader>
            <ConditionalActivationNotice
                entityId={entity.id ?? ""}
                runtime={runtime}
            />

            {isActive ? (
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
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                posthog?.capture("absorption_aborted", {
                                    entity_id: entity.id,
                                    assigned_count: data.assignedIds.length,
                                });
                                onRecallBodies(data.assignedIds);
                            }}
                        >
                            Abort
                        </Button>
                    </ActionRow>
                </>
            ) : (
                <AbsorptionCardIdleSection
                    data={data}
                    entity={entity}
                    runtime={runtime}
                    onOpenSelector={onOpenSelector}
                    onCloseSelector={onCloseSelector}
                    onConfirmBodies={(ids) => {
                        posthog?.capture("absorption_confirmed", {
                            entity_id: entity.id,
                            assigned_count: ids.length,
                        });
                        onConfirmBodies(ids);
                    }}
                    onCancelSelector={onCancelSelector}
                />
            )}
        </SelectionCardRoot>
    );
};

