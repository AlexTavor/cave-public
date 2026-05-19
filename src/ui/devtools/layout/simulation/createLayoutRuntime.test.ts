import { describe, it, expect } from "vitest";
import { DisplayInstanceManager } from "../../../../engine/phaser/display/instance-manager/DisplayInstanceManager";
import { createFakeDeps } from "../../../../engine/phaser/display/instance-manager/DisplayInstanceManager.testUtils";
import { createLayoutRuntime } from "./createLayoutRuntime";
import {
  createCartridge,
  createBlueprint,
} from "../../../../engine/test/factories";
import type { UnifiedBlueprintsAbilityConfig } from "../../../../data/schemas/abilities/unifiedBlueprints";

const makeBlueprint = (id: string) =>
  createBlueprint(id, {
    components: {
      display: { label: id, display_key: "unknown" },
      physics: { x: 10, y: 20, radius: 12, mass: 1, drag: 0, isStatic: false },
    },
  });

const makePhysicsOnlyBlueprint = (id: string) =>
  createBlueprint(id, {
    components: {
      display: undefined,
      physics: { x: 10, y: 20, radius: 12, mass: 1, drag: 0, isStatic: false },
    },
  });

const makeDisplayOnlyBlueprint = (id: string) =>
  createBlueprint(id, {
    components: {
      display: { label: id, display_key: "unknown" },
    },
  });

const unified = (rows: UnifiedBlueprintsAbilityConfig) => ({
  _editor: { abilities: { unifiedBlueprints: rows } },
});

describe("createLayoutRuntime", () => {
  it("spawns every cartridge blueprint including sys_world", () => {
    const cartridge = createCartridge("game.json", {
      blueprints: {
        valid: makeBlueprint("valid"),
        missingDisplay: makePhysicsOnlyBlueprint("missingDisplay"),
        missingPhysics: makeDisplayOnlyBlueprint("missingPhysics"),
        sys_world: createBlueprint("sys_world", { components: {} }),
      },
    });

    const runtime = createLayoutRuntime(cartridge);

    expect(runtime.getEntity("valid")).toBeDefined();
    expect(runtime.getEntity("missingDisplay")).toBeDefined();
    expect(runtime.getEntity("missingPhysics")).toBeDefined();
    expect(runtime.getEntity("sys_world")).toBeDefined();
    expect(runtime.getPhysicsBody("missingPhysics")).toBeUndefined();
  });

  it("initializes physics bodies at blueprint coordinates", () => {
    const runtime = createLayoutRuntime(
      createCartridge("game.json", {
        assets: { displays: { unknown: { type: "body" } } },
        blueprints: { valid: makeBlueprint("valid") },
      }),
    );
    expect(runtime.getPhysicsBody("valid")?.position).toMatchObject({
      x: 10,
      y: 20,
    });
  });

  it("preserves authored parent components for spawned layout entities", () => {
    const runtime = createLayoutRuntime(
      createCartridge("game.json", {
        blueprints: {
          parent: makeBlueprint("parent"),
          child: createBlueprint("child", {
            components: {
              parent: { kind: "entity_id", entityId: "parent" },
            },
          }),
        },
      }),
    );

    expect(runtime.getEntity("child")?.parent).toEqual({
      parentId: "parent",
    });
  });

  it("renders blueprint entities through the display manager", () => {
    const runtime = createLayoutRuntime(
      createCartridge("game.json", {
        assets: { displays: { unknown: { type: "body" } } },
        blueprints: { valid: makeBlueprint("valid") },
      }),
    );
    const deps = createFakeDeps();
    deps.pools = { ...deps.pools, getStats: () => ({}) } as any;
    deps.getRuntime = () => runtime as any;
    deps.shouldRenderEntity = (entity) => entity.id === "valid";

    const manager = new DisplayInstanceManager(deps);
    manager.tick(0, 16);

    expect(manager.getStats().activeInstances).toBe(1);
    expect(manager.getStats().activeByDisplayKey.body_avatar).toBe(1);
  });

  it("can suppress unified peer spawns for editor layout bootstraps", () => {
    const cartridge = createCartridge("game.json", {
      blueprints: {
        alpha: createBlueprint(
          "alpha",
          unified([{ tag: "quest", spawnWhenPeerSpawns: false }]),
        ),
        beta: createBlueprint(
          "beta",
          unified([{ tag: "quest", spawnWhenPeerSpawns: true }]),
        ),
      },
    });

    const defaultRuntime = createLayoutRuntime(cartridge);
    expect(
      defaultRuntime
        .getWorld()
        .entities.filter((entity) => entity.blueprintId === "beta"),
    ).toHaveLength(2);

    const suppressedRuntime = createLayoutRuntime(cartridge, {
      disablePeerBlueprintSpawns: true,
    });
    expect(
      suppressedRuntime
        .getWorld()
        .entities.filter((entity) => entity.blueprintId === "beta"),
    ).toHaveLength(1);
  });

  it("relinks tag-based parents after suppressed peer spawns", () => {
    const runtime = createLayoutRuntime(
      createCartridge("game.json", {
        blueprints: {
          absorption: createBlueprint("absorption", {
            components: {
              parent: { kind: "entity_tag", tag: "inside" },
            },
            ...unified([
              {
                tag: "inside",
                spawnWhenPeerSpawns: false,
              },
            ]),
          }),
          inside: createBlueprint("inside", {
            tags: ["inside"],
            ...unified([{ tag: "inside", spawnWhenPeerSpawns: true }]),
          }),
        },
      }),
      { disablePeerBlueprintSpawns: true },
    );

    expect(runtime.getEntity("absorption")?.parent).toEqual({
      parentId: "inside",
    });
    expect(
      runtime
        .getWorld()
        .entities.filter((entity) => entity.blueprintId === "inside"),
    ).toHaveLength(1);
  });
});
