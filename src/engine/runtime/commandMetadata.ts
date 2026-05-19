export type RuntimeCommandSourceLane =
    | "behavior_rule"
    | "draft_option"
    | "draft_on_complete"
    | "tutorial_on_complete"
    | "carrier_interaction";

export type RuntimeCommandCause = "starvation" | "purge";

export interface RuntimeDeadBodyPresentation {
    x: number;
    y: number;
    radius: number;
}

export interface RuntimeKilledEntityPresentation extends RuntimeDeadBodyPresentation {
    entityId: string;
}

export interface RuntimeAssignmentTransition {
    bodyId: string;
    beforeOwnerId: string;
    afterOwnerId: string;
}

export type RuntimeCommandMetadata = {
    sourceEntityId?: string;
    sourceLane?: RuntimeCommandSourceLane;
    cause?: RuntimeCommandCause;
    purgeMilestoneMessage?: string;
    deadBodyPresentation?: RuntimeDeadBodyPresentation;
    killedEntityPresentations?: RuntimeKilledEntityPresentation[];
    assignmentTransitions?: RuntimeAssignmentTransition[];
    [key: string]: unknown;
};

type MetadataCarrier = { metadata?: RuntimeCommandMetadata };

export const appendCommandMetadata = <TCommand extends object>(
    command: TCommand,
    patch: RuntimeCommandMetadata,
): TCommand & { metadata: RuntimeCommandMetadata } => {
    const carrier = command as TCommand & MetadataCarrier;
    return {
        ...command,
        metadata: { ...carrier.metadata, ...patch },
    };
};

export const patchCommandMetadataInPlace = <TCommand extends object>(
    command: TCommand,
    patch: RuntimeCommandMetadata,
): TCommand & { metadata: RuntimeCommandMetadata } => {
    const carrier = command as TCommand & MetadataCarrier;
    carrier.metadata = { ...carrier.metadata, ...patch };
    return carrier as TCommand & { metadata: RuntimeCommandMetadata };
};

export const readCommandSourceEntityId = (
    command: MetadataCarrier,
): string | undefined => command.metadata?.sourceEntityId;

export const readCommandSourceLane = (
    command: MetadataCarrier,
): RuntimeCommandSourceLane | undefined => command.metadata?.sourceLane;

export const readCommandCause = (
    command: MetadataCarrier,
): RuntimeCommandCause | undefined => command.metadata?.cause;

export const readCommandPurgeMilestoneMessage = (
    command: MetadataCarrier,
): string | undefined => command.metadata?.purgeMilestoneMessage;

export const readDeadBodyPresentation = (
    command: MetadataCarrier,
): RuntimeDeadBodyPresentation | undefined =>
    command.metadata?.deadBodyPresentation;

export const readKilledEntityPresentation = (
    command: MetadataCarrier,
    entityId: string,
): RuntimeKilledEntityPresentation | undefined =>
    command.metadata?.killedEntityPresentations?.find(
        (entry) => entry.entityId === entityId,
    );

export const readAssignmentTransitions = (
    command: MetadataCarrier,
): RuntimeAssignmentTransition[] =>
    Array.isArray(command.metadata?.assignmentTransitions)
        ? command.metadata.assignmentTransitions
        : [];
