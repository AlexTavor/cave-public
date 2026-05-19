export interface UseImpulseSettingsSessionParams {
    filename: string;
    tabId?: string;
}

export interface ImpulseSettingsSessionState {
    isLoading: boolean;
    draft: import("../../../../data/schemas/physics").ImpulseConfig | null;
    sessionId: string;
}
