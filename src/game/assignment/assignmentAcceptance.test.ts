import { describe, expect, it } from "vitest";
import {
    canAssignBodyToOwner,
    filterAssignableBodies,
    readAssignmentSlotLimit,
} from "./assignmentAcceptance";

const makeBody = (id: string, traits: string[] = []) => ({
    id,
    body: { traits },
});

describe("assignmentAcceptance", () => {
    it("allows an unrestricted owner to accept a matching body", () => {
        expect(
            canAssignBodyToOwner({
                body: makeBody("body-1"),
                owner: { id: "node", assignment: { assignedIds: [] } } as any,
            }),
        ).toEqual({ allowed: true, reason: "ok" });
    });

    it("rejects bodies that fail the assignment filter", () => {
        expect(
            canAssignBodyToOwner({
                body: makeBody("body-1"),
                owner: {
                    id: "node",
                    assignment: {
                        assignedIds: [],
                        filter: [
                            { kind: "required_traits_all", ids: ["swift"] },
                        ],
                    },
                } as any,
            }),
        ).toEqual({ allowed: false, reason: "filter_mismatch" });
    });

    it("rejects bodies when slots are full", () => {
        expect(
            canAssignBodyToOwner({
                body: makeBody("body-2"),
                owner: {
                    id: "node",
                    assignment: { slots: 1, assignedIds: ["body-1"] },
                } as any,
            }),
        ).toEqual({ allowed: false, reason: "slots_full" });
    });

    it("allows reassigning the same body to a full owner when ignored", () => {
        expect(
            canAssignBodyToOwner({
                body: makeBody("body-1"),
                owner: {
                    id: "node",
                    assignment: { slots: 1, assignedIds: ["body-1"] },
                } as any,
                ignoreBodyId: "body-1",
            }),
        ).toEqual({ allowed: true, reason: "ok" });
    });

    it("treats slot zero as unlimited and filters valid bodies only", () => {
        const owner = {
            id: "node",
            assignment: { slots: 0, assignedIds: [] },
        } as any;
        expect(readAssignmentSlotLimit(owner)).toBe(Number.POSITIVE_INFINITY);
        expect(
            filterAssignableBodies({
                bodies: [makeBody("body-1") as any],
                owner,
            }),
        ).toHaveLength(1);
    });
});
