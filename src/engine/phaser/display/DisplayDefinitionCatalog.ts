import type { DisplayDefinition } from "./moduleTypes";
import type { AvatarAppearanceRegistry } from "./avatar/AvatarAppearanceRegistry";
import type { GlyphRegistry } from "./glyph/GlyphRegistry";
import { BODY_AVATAR_DISPLAY_KEY } from "./avatar/AvatarDisplayConstants";
import { VeinsModule } from "./modules/veins/VeinsModule";
import { TransformModule } from "./modules/transfer/TransformModule";
import { createGlyphModule } from "./modules/glyph/GlyphModule";
import { createProgressBarsModule } from "./modules/progress-bar/ProgressBarsModule";
import { createAvatarModule } from "./modules/avatar/AvatarModule";
import { LightModule } from "./modules/light/LightModule";
import { SelectionModule } from "./modules/selection/SelectionModule";
import { DistressModule } from "./modules/distress/DistressModule";
import { InteractionModule } from "./modules/interaction/InteractionModule";
import { CycleProgressModule } from "./modules/cycle-progress/CycleProgressModule";
import { CaveBackgroundModule } from "./modules/cave/CaveBackgroundModule";
import { CaveEyesModule } from "./modules/cave/CaveEyesModule";
import { createMenuAmbientDisplayDefinitions } from "./MenuAmbientDisplayDefinition";

export const createDisplayDefinitions = (
    glyphRegistry: GlyphRegistry,
    avatarRegistry: AvatarAppearanceRegistry,
): DisplayDefinition[] => {
    const glyphModule = createGlyphModule(glyphRegistry);
    const progressBarsModule = createProgressBarsModule(glyphRegistry);
    const avatar = createAvatarModule(avatarRegistry);
    const avatarModules = [
        TransformModule,
        LightModule,
        avatar,
        InteractionModule,
        SelectionModule,
        DistressModule,
    ];
    const attributePoolModules = [
        TransformModule,
        LightModule,
        CycleProgressModule,
        glyphModule,
        progressBarsModule,
        InteractionModule,
        SelectionModule,
    ];
    const caveModules = [
        TransformModule,
        LightModule,
        CaveBackgroundModule,
        CaveEyesModule,
        progressBarsModule,
        InteractionModule,
        SelectionModule,
    ];

    return [
        { display_key: "veins_display", moduleStack: [VeinsModule] },
        { display_key: BODY_AVATAR_DISPLAY_KEY, moduleStack: avatarModules },
        { display_key: "cave_level", moduleStack: caveModules },
        { display_key: "generic_node", moduleStack: attributePoolModules },
        { display_key: "attr_body", moduleStack: attributePoolModules },
        { display_key: "attr_mind", moduleStack: attributePoolModules },
        { display_key: "attr_social", moduleStack: attributePoolModules },
        ...createMenuAmbientDisplayDefinitions(glyphRegistry),
    ];
};

