export type TutorialGuidanceDraft = {
    guidanceId: string;
    targetOverride?: any;
};

export const EMPTY_GUIDANCES: TutorialGuidanceDraft[] = [];

export const EMPTY_GUIDANCE_DEFS: Array<{
    id: string;
    presentation?: string;
    target?: any;
}> = [];
