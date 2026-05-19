import { describe, expect, it } from "vitest";
import snapshot from "../../../../public/bootstrap/vfs-prod.json";

const files = structuredClone(snapshot as unknown as Record<string, unknown>);
const rawFiles = {
    ...(import.meta as any).glob(
        "../../../data/raw/example/modules/progression.draft",
        { eager: true, query: "?raw", import: "default" },
    ),
    ...(import.meta as any).glob(
        "../../../data/raw/example/modules/understanding/*.bp",
        { eager: true, query: "?raw", import: "default" },
    ),
} as Record<string, string>;

const targets = [
    "example/modules/progression.draft",
    "example/modules/understanding/do_locals_know_of_me.bp",
    "example/modules/understanding/does_patriarchy_know_of_me.bp",
    "example/modules/understanding/how_big_can_i_get.bp",
    "example/modules/understanding/how_did_i_come_to_be.bp",
    "example/modules/understanding/how_hard_can_i_go.bp",
    "example/modules/understanding/what_am_i.bp",
];

const unwrap = (value: any) =>
    value?.blueprints
        ? value.blueprints[
              value.metadata?.id ?? Object.keys(value.blueprints)[0]
          ]
        : value;

const readRawTarget = (target: string) => {
    const raw = Object.entries(rawFiles).find(([path]) =>
        path.endsWith(target),
    )?.[1];
    return JSON.parse(raw ?? "null");
};

const assertDirectUnderstanding = (value: unknown) => {
    const text = JSON.stringify(value);
    expect(text).toContain("GAIN_UNDERSTANDING");
    expect(text).not.toContain("SPAWN_CARRIER");
    expect(text).not.toContain('"entityId":"self"');
};

describe("understanding reward content", () => {
    it("keeps direct understanding rewards in raw and bootstrap content", () => {
        targets.forEach((target) => {
            assertDirectUnderstanding(readRawTarget(target));
            assertDirectUnderstanding(unwrap(files[target]));
        });
    });
});
