import React from "react";
import { filterNodeOverlayModelsByCallouts } from "./filterNodeOverlayModelsByCallouts";
import { GuidanceCalloutCard } from "./GuidanceCalloutCard";
import { NodeOverlayCard } from "./NodeOverlayCard";
import type {
    GuidanceModel,
    RuntimeCalloutModel,
} from "./overlayViewportModels";
import type { ResolvedNodeOverlayModel } from "./nodeOverlayTypes";
import { RuntimeCalloutCard } from "./runtime-callouts/RuntimeCalloutCard";

const byFocus = (
    models: ResolvedNodeOverlayModel[],
    ids: Set<string> | null,
) => (ids ? models.filter((model) => ids.has(model.entityId)) : models);

const guideFocus = (models: GuidanceModel[], ids: Set<string> | null) =>
    ids
        ? models.filter(
              (model) => model.targetId === null || ids.has(model.targetId),
          )
        : models;

export const NodeOverlayCardsLayer = React.memo(
    ({
        nodeModels,
        guidanceModels,
        focusedIds,
    }: {
        nodeModels: ResolvedNodeOverlayModel[];
        guidanceModels: GuidanceModel[];
        focusedIds: Set<string> | null;
    }) => (
        <>
            {filterNodeOverlayModelsByCallouts(
                byFocus(nodeModels, focusedIds),
                guideFocus(guidanceModels, focusedIds),
            ).map((model) => (
                <NodeOverlayCard
                    key={`${model.entityId}-${model.kind}`}
                    model={model}
                />
            ))}
        </>
    ),
);

export const GuidanceCalloutLayer = React.memo(
    ({
        guidanceModels,
        focusedIds,
    }: {
        guidanceModels: GuidanceModel[];
        focusedIds: Set<string> | null;
    }) => (
        <>
            {guideFocus(guidanceModels, focusedIds).map((model) => (
                <GuidanceCalloutCard key={model.bindingId} model={model} />
            ))}
        </>
    ),
);

export const RuntimeCalloutLayer = React.memo(
    ({
        runtimeCalloutModels,
    }: {
        runtimeCalloutModels: RuntimeCalloutModel[];
    }) => (
        <>
            {runtimeCalloutModels.map((model) => (
                <RuntimeCalloutCard key={model.id} model={model} />
            ))}
        </>
    ),
);
