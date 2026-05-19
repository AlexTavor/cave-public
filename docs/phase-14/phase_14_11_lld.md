Low-Level Design: System Infra & Core Abilities

1. Why

Currently, the sys_world entity is hardcoded in TypeScript, creating a split source of truth where "Infrastructure" entities behave differently from "Game" entities. This prevents designers from tuning global parameters (like world bounds or initial resources) without code changes.

Additionally, critical entity properties like Biology (Body), Visual Identity (Passport), and Spatial existence (WorldPresence) are currently managed by manually editing generic components (state, display, physics). This is error-prone and verbose. We need High-Level Language (HLL) Abilities to abstract these patterns into strict, schema-validated configuration forms.

The Blueprint Editor toolbar is currently cluttered with generic actions (Undo/Redo, Save, Duplicate, Delete) that are redundant given the global toolbar or context menus. We will streamline this to focus purely on "Physics" (positioning mode) and move debugging tools like "Eject" to the global toolbar.

Finally, manual verification of rendering logic has proven insufficient. We need automated smoke tests to ensure entities with these new configurations render correctly without crashing the runtime. We also need to ensure that the new editors we are building mount and function correctly.

2. What

Data-Driven World: Migrate sys_world definition from runtimeWorld.ts to core.cave (System Config).

Schema Hardening: Define a mandatory, defaulted schema for the world entity in SysConfig.

New Abilities: Implement Body, Passport, and WorldPresence abilities with associated compilers and UI editors.

Editor Integration: Add a dedicated "World Entity" editor in the System Config dashboard.

UI Cleanup: Remove redundant actions from Blueprint Editor; promote "Eject" to the Global Toolbar.

Smoke Testing: Introduce automated rendering tests for Entity components and new Editor components.

3. How

3.1. Data Schemas

src/data/schemas/v2/spatial.ts

Update SpatialComponent to support the complex radius definition used by the display system, enabling reactive sizing at the infrastructure level.

import { z } from "zod";

export const SpatialRadiusSchema = z.object({
min: z.number().default(10),
max: z.number().default(20),
valueRef: z.string().optional(),
maxRef: z.string().optional(),
});

export const SpatialComponentSchema = z.object({
x: z.number().default(0),
y: z.number().default(0),
radius: SpatialRadiusSchema,
});

export type SpatialComponent = z.infer<typeof SpatialComponentSchema>;

src/data/schemas/v2/config.ts

Define the World Entity structure strictly and provide the canonical default.

import { z } from "zod";
import { ImpulseConfigSchema } from "../physics";
import { DEFAULT_GAME_CONFIG, GameConfigSchema, VitalitySettingsSchema } from "../game/config";

// The hardcoded default previously in runtimeWorld.ts
const DEFAULT_WORLD_ENTITY = {
id: "sys_world",
label: "World",
tags: ["sys_world"],
state: {},
behavior: { rules: [] },
display: {
label: "Cave",
icon: "cave_level",
radius: {
min: 30,
max: 60,
valueRef: "self.state.health.value",
maxRef: "self.state.health.max",
},
bars: [
{
key: "state.health",
max: 1,
color: "#4caf50",
label: "Health",
},
],
},
physics: {
mass: 50,
radius: 55,
drag: 0.1,
isStatic: true,
x: 458,
y: 331,
},
};

export const SysConfigSchema = z.object({
impulse: ImpulseConfigSchema,
vitality: VitalitySettingsSchema.default(DEFAULT_GAME_CONFIG.vitality),
game_config: GameConfigSchema.default(DEFAULT_GAME_CONFIG),
// Mandatory world definition with default
world: z.record(z.string(), z.unknown()).default(DEFAULT_WORLD_ENTITY),
});

export type SysConfig = z.infer<typeof SysConfigSchema>;

src/data/schemas/blueprint.ts

Update the Blueprint schema to support the new spatial component.

import { z } from "zod";
// ... imports
import { SpatialComponentSchema } from "./v2/spatial";

export const BlueprintSchema = z.object({
// ... existing fields
components: z.object({
// ... existing components
spatial: SpatialComponentSchema.optional(),
}),
// ...
});

src/data/schemas/abilities/body.ts

New ability for biological stats.

import { z } from "zod";
import { AttributeSetSchema } from "../game/body";

export const BodyAbilitySchema = z.object({
baseAttributes: AttributeSetSchema.default({ body: 1, mind: 1, social: 1 }),
health: z.number().default(100),
traits: z.array(z.string()).default([]),
xp: z.number().default(0),
level: z.number().default(1),
});

export type BodyAbilityConfig = z.infer<typeof BodyAbilitySchema>;

src/data/schemas/abilities/passport.ts

New ability for identity and appearance.

import { z } from "zod";

export const PassportAbilitySchema = z.object({
label: z.string().default("Unknown"),
icon: z.string().describe("ui:icon").default("unknown"),
description: z.string().optional(),
styleId: z.string().describe("ui:style").optional(),
});

export type PassportAbilityConfig = z.infer<typeof PassportAbilitySchema>;

src/data/schemas/abilities/spatial.ts

New ability for spatial positioning.

import { z } from "zod";
import { SpatialRadiusSchema } from "../v2/spatial";

export const WorldPresenceAbilitySchema = z.object({
x: z.number().default(0),
y: z.number().default(0),
radius: SpatialRadiusSchema,
});

export type WorldPresenceAbilityConfig = z.infer<typeof WorldPresenceAbilitySchema>;

src/data/schemas/abilities/index.ts

Register new abilities.

import { BodyAbilitySchema } from "./body";
import { PassportAbilitySchema } from "./passport";
import { WorldPresenceAbilitySchema } from "./spatial";

export const EditorAbilitiesSchema = z.object({
// ... existing
body: BodyAbilitySchema.optional(),
passport: PassportAbilitySchema.optional(),
worldPresence: WorldPresenceAbilitySchema.optional(),
});

3.2. Module Logic & Parsing

src/lib/modules/semanticModuleFragments.ts

Map the world field explicitly.

// toCaveModule
return ModuleCartridgeSchema.parse({
// ... metadata
blueprint: {
traits: {},
settings: {
impulse,
game_config: gameConfig,
world: input.world, // Persist world config
},
},
});

// toSemanticFragment
if (isCaveFile(filename)) {
return {
// ... existing
world: moduleData.blueprint?.settings?.world,
};
}

3.3. Compilers

src/engine/compiler/abilities/bodyCompiler.ts

import type { Blueprint } from "../../../data/schemas/blueprint";
import type { BodyAbilityConfig } from "../../../data/schemas/abilities/body";

export const bodyCompiler = (draft: Blueprint, config: BodyAbilityConfig) => {
draft.components ??= {};
draft.components.body = {
xp: config.xp,
level: config.level,
health: config.health,
maxHealth: config.health,
baseAttributes: config.baseAttributes,
attributes: config.baseAttributes,
traits: config.traits,
passport: {
name: draft.label ?? "Unknown",
description: "",
},
};
};

src/engine/compiler/abilities/passportCompiler.ts

import type { Blueprint } from "../../../data/schemas/blueprint";
import type { PassportAbilityConfig } from "../../../data/schemas/abilities/passport";

export const passportCompiler = (draft: Blueprint, config: PassportAbilityConfig) => {
draft.components ??= {};

    // 1. Compile to Display
    draft.components.display ??= {} as any;
    draft.components.display.label = config.label;
    draft.components.display.icon = config.icon;
    draft.components.display.description = config.description;
    if (config.styleId) {
        draft.components.display.style = config.styleId;
    }

    // 2. Compile to Body Passport (safe merge)
    if (draft.components.body) {
        draft.components.body.passport = {
            name: config.label,
            description: config.description,
            portraitIcon: config.icon,
        };
    }

    // 3. Update root metadata
    draft.label = config.label;

};

src/engine/compiler/abilities/spatialCompiler.ts

import type { Blueprint } from "../../../data/schemas/blueprint";
import type { WorldPresenceAbilityConfig } from "../../../data/schemas/abilities/spatial";

export const spatialCompiler = (draft: Blueprint, config: WorldPresenceAbilityConfig) => {
draft.components ??= {};

    // 1. Physics (LLL target) - Explicitly static
    draft.components.physics ??= {
        mass: 1,
        drag: 0.1,
        isStatic: true,
        radius: config.radius.max,
        x: config.x,
        y: config.y
    } as any;

    // Overwrite to ensure ability authority
    draft.components.physics.x = config.x;
    draft.components.physics.y = config.y;
    draft.components.physics.radius = config.radius.max;
    draft.components.physics.isStatic = true;

    // 2. Display (LLL target)
    draft.components.display ??= {} as any;
    draft.components.display.radius = {
        min: config.radius.min,
        max: config.radius.max,
        valueRef: config.radius.valueRef,
        maxRef: config.radius.maxRef,
    };

    // 3. Spatial Component (v2 target)
    draft.components.spatial = {
        x: config.x,
        y: config.y,
        radius: config.radius
    };

};

src/engine/compiler/CompilerService.ts

Integrate compilers with strict ordering.

// in compile() method:
const abilities = draft.\_editor.abilities;

if (abilities.body) bodyCompiler(draft, abilities.body);
if (abilities.passport) passportCompiler(draft, abilities.passport);
if (abilities.worldPresence) spatialCompiler(draft, abilities.worldPresence);

// ... rest

3.4. Runtime

src/engine/runtime/runtimeWorld.ts

Remove fallback defaults.

import type { World } from "miniplex";
import type { RuntimeEntity } from "./types";

export const ensureWorldEntity = (
world: World<RuntimeEntity>,
config: Record<string, unknown>
): void => {
const hasWorld = world.entities.some((entity) => entity.id === "sys_world");
if (hasWorld) return;

    // Direct injection. Schema guarantees valid structure.
    world.add({ ...config, id: "sys_world" });

};

src/engine/runtime/RuntimeCore.ts

Inject from cartridge.

// Constructor
// ...
const worldConfig = this.cartridge.config.world; // Type safe access via updated SysConfig
ensureWorldEntity(this.entityStore.getWorld(), worldConfig);
// ...

3.5. UI & Editors

src/ui/devtools/editors/blueprint/mode/forms/BodyAbilityForm.tsx (New)

Base Attributes: Collapsible ObjectField for baseAttributes.

Vitals: NumberFields for health, xp, level.

Traits: ArrayField for string IDs.

src/ui/devtools/editors/blueprint/mode/forms/PassportAbilityForm.tsx (New)

StringField for label, description.

IconPicker for icon.

StringField for styleId.

src/ui/devtools/editors/blueprint/mode/forms/WorldPresenceAbilityForm.tsx (New)

NumberField for x, y.

Radius: Group for min, max, valueRef (AutocompleteStringField), maxRef (AutocompleteStringField).

src/ui/devtools/editors/blueprint/mode/abilitySchemas.ts

Add schemas.

src/ui/devtools/editors/blueprint/mode/SingleAbilityRow.tsx

Add entries for body, passport, worldPresence.

src/ui/devtools/editors/blueprint/editor/BlueprintEditor.tsx

Remove: UndoButton, RedoButton, DeleteButton, DuplicateButton, SaveButton, EjectButton.
Keep: PhysicsButton.

src/ui/devtools/shell/GlobalEditorToolbar.tsx

Add EjectButton to the global toolbar.

src/ui/devtools/shell/window-manager/tabIds.ts

Add world_entity.

src/ui/devtools/shell/window-manager/WindowLayoutResolver.editors.tsx

Map world_entity to WorldEntityEditor.

src/ui/devtools/editors/config/WorldEntityEditor.tsx (New)

import React from "react";
import { SessionJsonEditor } from "../manifest/SessionJsonEditor";

export const WorldEntityEditor: React.FC<{ filename: string }> = ({ filename }) => {
return (
<SessionJsonEditor 
            filename={filename} 
            rootPath="blueprint.settings.world" 
            title="World Entity (Infra)" 
        />
);
};

src/ui/devtools/editors/config/SystemConfigEditor.tsx

Add "World Entity" card.

src/ui/devtools/shell/window-manager/hooks/useWindowManagerRouteHandlers.base.ts

Add handler for world_entity.

3.6. Testing

src/ui/runtime/world/EntityNode.smoke.test.tsx (New)

Automated smoke tests for the primary entity renderer.

import { render } from "@testing-library/react";
import { EntityNode } from "./EntityNode";
import { makeBodyEntity } from "../../../game/systems/testUtils";

describe("EntityNode Smoke Tests", () => {
it("mounts without crashing with body components", () => {
const entity = makeBodyEntity("test_1", { body: 1, mind: 1, social: 1 });
const { container } = render(<EntityNode entity={entity} />);
expect(container).toBeInTheDocument();
});

    it("renders display labels correctly", () => {
        const entity = {
            id: "test_2",
            display: { label: "Test Label", icon: "test_icon", radius: { min: 10, max: 10 } },
            state: {}
        };
        const { getByText } = render(<EntityNode entity={entity} />);
        expect(getByText("Test Label")).toBeInTheDocument();
    });

});

src/ui/devtools/editors/Editors.smoke.test.tsx (New)

Automated smoke tests to verify all major editor views mount correctly.

import { render } from "@testing-library/react";
import { SystemConfigEditor } from "./config/SystemConfigEditor";
import { AssetPackEditor } from "./file/AssetPackEditor";
import { WorldEntityEditor } from "./config/WorldEntityEditor";
import { BlueprintEditor } from "./blueprint/editor/BlueprintEditor";
// Mock stores/contexts as needed (useSessionStore, useShellStore)

describe("Devtools Editors Smoke Tests", () => {
it("renders SystemConfigEditor", () => {
const { getByText } = render(<SystemConfigEditor filename="core.cave" />);
expect(getByText("System Config")).toBeInTheDocument();
});

    it("renders AssetPackEditor", () => {
        const { getByText } = render(<AssetPackEditor filename="assets.art" />);
        expect(getByText("Asset Pack: assets.art")).toBeInTheDocument();
    });

    // Add tests for WorldEntityEditor and BlueprintEditor with mocked context

});

4. Verification Plan

Smoke Tests: Run npm test to ensure all new and existing editor components mount without crashing.

Sys World: Open .cave -> Click "World Entity" -> Change values -> Save -> Reload Runtime -> Verify world updates.

Abilities: Create Blueprint with new abilities -> Eject -> Verify JSON structure -> Spawn -> Verify runtime behavior.

UI Cleanup: Confirm Blueprint Editor toolbar is minimal and Global Toolbar contains Eject.
