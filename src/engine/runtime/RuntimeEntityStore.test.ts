import { describe, it, expect } from "vitest";
import { RuntimeEntityStore } from "./RuntimeEntityStore";

describe("RuntimeEntityStore", () => {
    it("indexes entities by id and sorts by id", () => {
        // Given
        const store = new RuntimeEntityStore();

        // When
        store.addEntity({ id: "b" });
        store.addEntity({ id: "a" });
        const entities = store.getEntities();

        // Then
        expect(store.getEntity("a")).toBe(entities[0]);
        expect(entities.map((entity) => entity.id)).toEqual(["a", "b"]);
    });

    it("refreshes sorting when command world changes", () => {
        // Given
        const store = new RuntimeEntityStore();
        store.addEntity({ id: "b" });
        store.getEntities();

        // When
        store.getCommandWorld().add({ id: "a" });
        const entities = store.getEntities();

        // Then
        expect(entities.map((entity) => entity.id)).toEqual(["a", "b"]);
    });
});
