import { describe, expect, it } from "vitest";
import type { AssignmentJobCardData } from "../job-card/jobCardTypes";
import { resolveAssignmentJobCardModel } from "./resolveAssignmentJobCardModel";

const makeData = (): AssignmentJobCardData => ({
    variant: "assignment",
    label: "Pool",
    description: "desc",
    assignedIds: [],
    duration: 100,
    isSelectorOpen: false,
    canAssignMoreBodies: true,
    isDepleted: false,
    isInactive: false,
    requirements: {
        filterLabels: ["Requires traits: brave"],
        minimumRows: [
            { label: "Body", current: 2, required: 2, satisfied: true },
            { label: "Mind", current: 0, required: 1, satisfied: false },
        ],
    } as any,
    storageModels: [],
    suspiciousActivity: {
        text: "Risky",
        color: "#f00",
        tooltipTitle: "Suspicious Activity",
        tooltipLines: ["Warn"],
    },
});

describe("resolveAssignmentJobCardModel", () => {
    it("renders assignment requirements as generic capsules without React nodes", () => {
        const model = resolveAssignmentJobCardModel(makeData(), "pool-1");
        const requirements = model.sections[0]?.capsules ?? [];
        expect(model.badges?.[0]?.value).toEqual({ text: "Risky" });
        expect(model.sections[0]?.title).toBe("Assignment Requirements");
        expect(requirements[0]?.value).toEqual({
            text: "Requires traits: brave",
        });
        expect(requirements[1]).toEqual(
            expect.objectContaining({
                title: "Body",
                skin: "success",
                value: { text: "2/2" },
            }),
        );
        expect(requirements[2]).toEqual(
            expect.objectContaining({
                title: "Mind",
                skin: "warning",
                value: { text: "0/1" },
            }),
        );
        expect(
            model.sections.some((section) => section.customContentKind),
        ).toBe(false);
    });
});
