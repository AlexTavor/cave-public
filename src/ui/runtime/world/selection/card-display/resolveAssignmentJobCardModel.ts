import type { AssignmentJobCardData } from "../job-card/jobCardTypes";
import { adaptAbilityBarsToCapsules } from "./adaptAbilityBarsToCapsules";
import type {
    CardSectionModel,
    SelectionCardModel,
    ValueCapsuleModel,
} from "./cardDisplayTypes";

const resolveRequirementCapsules = (
    data: AssignmentJobCardData,
    entityId: string,
): ValueCapsuleModel[] => [
    ...data.requirements.filterLabels.map((label, index) => ({
        id: `${entityId}:requirement:filter:${index}`,
        skin: "modifier" as const,
        value: { text: label },
        effects: [],
    })),
    ...data.requirements.minimumRows.map((row) => ({
        id: `${entityId}:requirement:${row.label}`,
        skin: row.satisfied ? ("success" as const) : ("warning" as const),
        title: row.label,
        value: { text: `${row.current}/${row.required}` },
        effects: [],
    })),
];

export const resolveAssignmentJobCardModel = (
    data: AssignmentJobCardData,
    entityId: string,
): SelectionCardModel => {
    const sections: CardSectionModel[] = [];
    const requirementCapsules = resolveRequirementCapsules(data, entityId);
    if (requirementCapsules.length) {
        sections.push({
            id: `${entityId}:requirements`,
            title: "Assignment Requirements",
            layout: "column",
            density: "normal",
            capsules: requirementCapsules,
        });
    }
    if (data.storageModels.length) {
        sections.push({
            id: `${entityId}:storage`,
            layout: "column",
            density: "normal",
            capsules: adaptAbilityBarsToCapsules(data.storageModels),
        });
    }
    return {
        id: `assignment:${entityId}`,
        entityId,
        title: { id: `${entityId}:title`, text: data.label },
        badges: data.suspiciousActivity
            ? [
                  {
                      id: `${entityId}:suspicious`,
                      skin: "danger",
                      value: { text: data.suspiciousActivity.text },
                      effects: [],
                      tooltip: {
                          title: data.suspiciousActivity.tooltipTitle,
                          lines: data.suspiciousActivity.tooltipLines,
                      },
                  },
              ]
            : undefined,
        description: { id: `${entityId}:description`, text: data.description },
        conditionalNoticeEntityId: entityId,
        sections,
    };
};
