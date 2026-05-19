export interface GainUnderstandingAction {
    type: "GAIN_UNDERSTANDING";
    understandingId: string;
    entityId?: string;
}

export interface GainHabitiAction {
    type: "GAIN_HABITI";
    habitusId: string;
    entityId?: string;
}
