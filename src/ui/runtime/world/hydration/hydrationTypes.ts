export type HydrationDependencyPlan = {
    entityIds: string[];
    includeEntityListRevision: boolean;
    includeBlueprintRevision: boolean;
    includeMutationRevision?: boolean;
    includeFrameRevision?: boolean;
};
