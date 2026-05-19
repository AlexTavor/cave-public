import type { FactScope } from "../../../data/schemas/conditions";
import type { ThoughtResumeStatus } from "../../../data/schemas/components/thought";

export interface ShowThoughtCommandPayload {
    thoughtId: string;
    body: string;
    rememberScope: FactScope;
    resumeStatus: ThoughtResumeStatus;
}

export interface AcknowledgeThoughtCommandPayload {
    thoughtId: string;
}

export interface ClearThoughtCommandPayload {
    reason?: string;
}
