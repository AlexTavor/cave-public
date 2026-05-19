import { describe, expect, it } from "vitest";
import {
    formatOngoingRuntimeNotificationText,
    formatRuntimeEventText,
} from "./formatRuntimeNotificationText";

describe("formatRuntimeNotificationText", () => {
    it("formats event text for singular, plural, level-up, and discovery aggregation", () => {
        // Given
        const singular = {
            id: "1",
            kind: "body_added",
            aggregationKey: "body_added",
            count: 1,
            updatedAtMs: 0,
            expiresAtMs: 1,
        } as any;
        const plural = {
            ...singular,
            count: 2,
            kind: "body_starved",
            aggregationKey: "body_starved",
        };
        const levelUp = {
            ...singular,
            count: 2,
            kind: "body_level_up",
            aggregationKey: "body_level_up:3",
            level: 3,
        };
        const discovery = {
            ...singular,
            count: 2,
            kind: "entity_discovered",
            aggregationKey: "entity_discovered:ore",
            entityLabel: "Ore",
        };
        const milestone = {
            ...singular,
            kind: "purge_milestone",
            aggregationKey: "purge_milestone:dread",
            entityLabel: "The darkness grows.",
        };

        // Then
        expect(formatRuntimeEventText(singular).text).toBe("1 new body");
        expect(formatRuntimeEventText(plural).text).toBe("2 bodies starved");
        expect(formatRuntimeEventText(levelUp).text).toBe(
            "2 bodies reached level 3",
        );
        expect(formatRuntimeEventText(discovery).text).toBe(
            "Ore discovered (x2)",
        );
        expect(formatRuntimeEventText(milestone).text).toBe(
            "The darkness grows.",
        );
    });

    it("returns structured ongoing text for hungry and cold keywords", () => {
        // Given
        const hungry = {
            key: "hungry",
            kind: "hungry_bodies",
            guidanceId: "ongoing_survival_spiral",
            count: 1,
            priority: 2,
        } as any;
        const cold = {
            key: "cold",
            kind: "cold_bodies",
            guidanceId: "ongoing_survival_spiral",
            count: 2,
            priority: 3,
        } as any;

        // Then
        expect(formatOngoingRuntimeNotificationText(hungry).parts[0]).toEqual({
            text: "1 body is",
        });
        expect(formatOngoingRuntimeNotificationText(hungry).parts[1]).toEqual({
            text: "hungry",
            colorKey: "statusKeywordHungry",
        });
        expect(formatOngoingRuntimeNotificationText(cold).parts[0]).toEqual({
            text: "2 bodies are",
        });
        expect(formatOngoingRuntimeNotificationText(cold).parts[1]).toEqual({
            text: "cold",
            colorKey: "statusKeywordCold",
        });
    });
    it("formats purge status ongoing text", () => {
        expect(
            formatOngoingRuntimeNotificationText({
                key: "purge_active",
                kind: "purge_active",
                guidanceId: "ongoing_purge_active",
                priority: 1,
            }).parts,
        ).toEqual([{ text: "The Purge is on" }]);
    });

    it("formats Suspicion text with the authored raw color", () => {
        expect(
            formatOngoingRuntimeNotificationText({
                key: "suspicion",
                kind: "suspicion",
                guidanceId: "ongoing_suspicion",
                priority: 4,
                levelText: "High",
                levelColor: "#ff0000",
            }),
        ).toEqual({
            parts: [{ text: "Suspicion:" }, { text: "High", color: "#ff0000" }],
            tone: "default",
        });
    });
});
