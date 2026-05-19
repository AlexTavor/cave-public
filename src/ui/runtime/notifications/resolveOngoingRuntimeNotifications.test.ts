import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveOngoingRuntimeNotifications } from "./resolveOngoingRuntimeNotifications";

const makeRuntime = ({
    purgeValue = 25,
    purgeMaxBonus = 0,
    suspicionRules = [{ text: "Moderate", color: "#ff9500", threshold: 0.25 }],
    susDisplays = [{ text: "Wrong", color: "#00ff00", threshold: 0 }],
} = {}) => {
    const world = {
        id: "sys_world",
        cave: { purge: { isActive: true } },
        state: {
            purge_progress: { value: purgeValue },
            habiti_purge_progress_max_bonus: { value: purgeMaxBonus },
        },
    };
    const entities = [
        world,
        { id: "body-1", body: {}, traits: ["starving"] },
        { id: "body-2", body: {}, traits: ["cold"] },
    ] as any[];
    return {
        getEntities: () => entities,
        getEntity: () => world,
        getCartridge: () => ({
            config: {
                settings: {
                    game_config: {
                        suspicionNotificationDisplays: suspicionRules,
                        susDisplays,
                    },
                },
            },
        }),
    } as any;
};

afterEach(() => vi.restoreAllMocks());

describe("resolveOngoingRuntimeNotifications", () => {
    it("derives ongoing notifications in priority order and includes Suspicion data", () => {
        const runtime = makeRuntime();
        const result = resolveOngoingRuntimeNotifications(runtime);
        expect(result.map((item) => item.kind)).toEqual([
            "purge_active",
            "hungry_bodies",
            "cold_bodies",
            "suspicion",
        ]);
        expect(result[3]).toEqual(
            expect.objectContaining({
                guidanceId: "ongoing_suspicion",
                levelText: "Moderate",
                levelColor: "#ff9500",
            }),
        );
    });

    it("returns empty when runtime is missing", () => {
        expect(resolveOngoingRuntimeNotifications(null)).toEqual([]);
    });

    it("omits Suspicion and logs when no authored display matches", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const result = resolveOngoingRuntimeNotifications(
            makeRuntime({
                purgeValue: 0,
                suspicionRules: [
                    { text: "High", color: "#ff0000", threshold: 0.1 },
                ],
            }),
        );
        expect(result.map((item) => item.kind)).not.toContain("suspicion");
        expect(error).toHaveBeenCalledWith(
            "No authored Suspicion notification display matched.",
        );
    });

    it("ignores susDisplays when resolving Suspicion", () => {
        const result = resolveOngoingRuntimeNotifications(
            makeRuntime({
                suspicionRules: [
                    { text: "Correct", color: "#ff0000", threshold: 0.25 },
                ],
                susDisplays: [
                    { text: "Wrong", color: "#00ff00", threshold: 0 },
                ],
            }),
        );
        expect(result.find((item) => item.kind === "suspicion")).toEqual(
            expect.objectContaining({
                levelText: "Correct",
                levelColor: "#ff0000",
            }),
        );
    });

    it("uses the effective purge max when matching Suspicion thresholds", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const result = resolveOngoingRuntimeNotifications(
            makeRuntime({
                purgeValue: 25,
                purgeMaxBonus: 100,
                suspicionRules: [
                    { text: "High", color: "#ff0000", threshold: 0.2 },
                ],
            }),
        );
        expect(result.map((item) => item.kind)).not.toContain("suspicion");
    });
});
