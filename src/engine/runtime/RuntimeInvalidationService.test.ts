import { describe, expect, it, vi } from "vitest";
import { RuntimeInvalidationService } from "./RuntimeInvalidationService";

describe("RuntimeInvalidationService", () => {
    it("flushes a buffered frame mutation once for multi-scope listeners", () => {
        const service = new RuntimeInvalidationService();
        const listener = vi.fn();
        service.reader.subscribe(["frame", "mutation", "entity:a"], listener);
        service.bufferSummary({
            changedEntityIds: ["a"],
            entityListChanged: true,
            blueprintChanged: false,
        });

        service.publishFrame(4);

        expect(listener).toHaveBeenCalledTimes(1);
        expect(service.reader.getFrameRevision()).toBe(4);
        expect(service.reader.getMutationRevision()).toBe(1);
        expect(service.reader.getEntityListRevision()).toBe(1);
        expect(service.reader.getEntityRevision("a")).toBe(1);
        expect(service.reader.getLastChangedEntityIds()).toEqual(["a"]);
    });

    it("bumps world revision and clears entity-specific state on world reset", () => {
        const service = new RuntimeInvalidationService();
        service.publishMutationSummary({
            changedEntityIds: ["a"],
            entityListChanged: false,
            blueprintChanged: true,
        });

        service.publishWorldReset(9);

        expect(service.reader.getWorldRevision()).toBe(1);
        expect(service.reader.getFrameRevision()).toBe(9);
        expect(service.reader.getEntityRevision("a")).toBe(0);
        expect(service.reader.getLastChangedEntityIds()).toEqual([]);
        expect(service.reader.getBlueprintRevision()).toBe(1);
    });
});
