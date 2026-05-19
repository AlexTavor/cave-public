import type { BlueprintConfig } from "../../data/schemas/blueprintConfig";
import type {
    DraftOptionBlueprint,
    DraftPoolBlueprint,
} from "../../data/schemas/draft";
import type {
    DisplayAsset,
    EntityStyle,
    GlyphPreset,
} from "../../data/schemas/assets";
import type {
    AssignmentComponent,
    AutomationComponent,
    BehaviorComponent,
    BodyComponent,
    BuffComponent,
    CaveComponent,
    PassiveEffect,
    PowerSinkComponent,
} from "../../data/schemas/components";
import type { SpatialComponent } from "../../data/schemas/v2/spatial";
import type { RenderComponent } from "../../data/schemas/v2/render";
import type { PhysicsComponentV2 } from "../../data/schemas/v2/physics";
import type { SysConfig } from "../../data/schemas/v2/config";

type StateComponent = Record<string, unknown>;

export interface BlueprintV2 {
    id: string;
    label?: string;
    tags?: string[];
    spatial?: SpatialComponent;
    render?: RenderComponent;
    physics?: PhysicsComponentV2;
    state?: StateComponent;
    assignment?: AssignmentComponent;
    behavior?: BehaviorComponent;
    automation?: AutomationComponent;
    body?: BodyComponent;
    cave?: CaveComponent;
    powerSink?: PowerSinkComponent;
    passiveEffects?: PassiveEffect[];
    buffs?: BuffComponent;
}

export interface RuntimeCartridge {
    metadata: {
        id: string;
        version: string;
    };
    blueprints: Record<string, BlueprintV2>;
    draft: {
        draftOptions: Record<string, DraftOptionBlueprint>;
        draftPools: Record<string, DraftPoolBlueprint>;
    };
    assets: {
        styles: Record<string, EntityStyle>;
        glyphs?: Record<string, GlyphPreset>;
        displays: Record<string, DisplayAsset>;
        settings?: Record<string, unknown>;
    };
    config: SysConfig;
    blueprint?: BlueprintConfig;
}

