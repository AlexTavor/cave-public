import type { TutorialComponent } from "../components/TutorialComponent";

export interface SetTutorialStateCommandPayload {
    tutorial: TutorialComponent | null;
}

export interface AcknowledgeTutorialModalGuidanceCommandPayload {
    bindingId: string;
}
