export interface AssignBodiesBatchUpdate {
    bodyId: string;
    ownerId: string;
    mode?: "drag_restore";
    expectedCurrentOwnerId?: string;
}
