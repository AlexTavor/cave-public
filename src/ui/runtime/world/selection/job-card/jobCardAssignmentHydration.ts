import type { AssignmentJobCardData } from "./jobCardTypes";
import {
    storageModelsEqual,
    stringArrayEqual,
} from "../selectionHydrationUtils";
import { suspiciousActivityEqual } from "./jobCardHydrationEquality";

const assignmentRequirementsEqual = (left: any, right: any) =>
    stringArrayEqual(left.filterLabels, right.filterLabels) &&
    left.minimumRows.length === right.minimumRows.length &&
    left.minimumRows.every((row: any, index: number) => {
        const other = right.minimumRows[index];
        return (
            row.label === other.label &&
            row.current === other.current &&
            row.required === other.required &&
            row.satisfied === other.satisfied
        );
    });

export const assignmentJobCardEqual = (
    left: AssignmentJobCardData,
    right: AssignmentJobCardData,
) =>
    left.label === right.label &&
    left.description === right.description &&
    stringArrayEqual(left.assignedIds, right.assignedIds) &&
    left.duration === right.duration &&
    left.isSelectorOpen === right.isSelectorOpen &&
    left.canAssignMoreBodies === right.canAssignMoreBodies &&
    left.isDepleted === right.isDepleted &&
    left.isInactive === right.isInactive &&
    assignmentRequirementsEqual(left.requirements, right.requirements) &&
    storageModelsEqual(left.storageModels, right.storageModels) &&
    suspiciousActivityEqual(left.suspiciousActivity, right.suspiciousActivity);
