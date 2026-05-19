import React from "react";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { Button } from "../../../../lib/atoms/button";
import { Modal } from "../../../../lib/atoms/modal";
import type { AssignmentJobCardData } from "./jobCardTypes";
import { CardModelView } from "../card-display/organisms/CardModelView";
import { resolveAssignmentJobCardModel } from "../card-display/resolveAssignmentJobCardModel";
import { ActionRow } from "../absorption/AbsorptionCard.styles";
import { BodySelector } from "../absorption/BodySelector";
import { useAbsorptionActions } from "../absorption/useAbsorptionActions";

export const AssignmentJobCardView: React.FC<{
    data: AssignmentJobCardData;
    entity: RuntimeEntity;
    runtime: Runtime;
}> = ({ data, entity, runtime }) => {
    const actions = useAbsorptionActions(
        runtime,
        entity.id ?? "",
        data.isSelectorOpen,
    );
    const showSelectBodies =
        !data.isDepleted &&
        data.isInactive !== true &&
        data.canAssignMoreBodies;
    const showAbort = data.assignedIds.length > 0;
    const showActions = showSelectBodies || showAbort;
    const model = resolveAssignmentJobCardModel(data, entity.id ?? "");
    const sections = showActions
        ? [
              ...model.sections,
              {
                  id: `${entity.id ?? ""}:actions`,
                  layout: "column" as const,
                  density: "normal" as const,
                  customContentKind: "actions",
              },
          ]
        : model.sections;
    const customSlots = showActions
        ? {
              actions: (
                  <ActionRow>
                      {showAbort ? (
                          <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                  actions.recallBodies(data.assignedIds)
                              }
                          >
                              Abort
                          </Button>
                      ) : null}
                      {showSelectBodies ? (
                          <Button
                              size="lg"
                              variant="primary"
                              onClick={actions.openSelector}
                          >
                              Select Bodies
                          </Button>
                      ) : null}
                  </ActionRow>
              ),
          }
        : undefined;

    return (
        <>
            <CardModelView
                model={{ ...model, sections }}
                customSlots={customSlots}
                runtime={runtime}
            />
            <Modal isOpen={data.isSelectorOpen} onClose={actions.closeSelector}>
                <BodySelector
                    runtime={runtime}
                    stationEntity={entity}
                    onConfirm={(ids) => {
                        actions.dispatchBodies(ids);
                        actions.closeSelector();
                    }}
                    onCancel={actions.closeSelector}
                />
            </Modal>
        </>
    );
};
