import React from "react";
import { ImpulseSettingsEditor } from "../../editors/physics/ImpulseSettingsEditor";
import { BackgroundConfigEditor } from "../../editors/config/BackgroundConfigEditor";
import { GameConfigEditor } from "../../editors/config/GameConfigEditor";
import { VeinConfigEditor } from "../../editors/config/VeinConfigEditor";
import { WorldEntityEditor } from "../../editors/config/WorldEntityEditor";
import { TraitsEditor } from "../../editors/config/TraitsEditor";
import { CameraWorldConfigEditor } from "../../editors/config/CameraWorldConfigEditor";
import { ConditionsEditor } from "../../editors/config/conditions/ConditionsEditor";
import { GuidancesEditor } from "../../editors/config/guidances/GuidancesEditor";
import { KnowledgeEditor } from "../../editors/config/knowledge/KnowledgeEditor";
import { TutorialsEditor } from "../../editors/config/tutorials/TutorialsEditor";
import { BodyEditor } from "../../editors/config/body/BodyEditor";
import { CarrierEditor } from "../../editors/config/carrier/CarrierEditor";
import { UnderstandingEditor } from "../../editors/config/understanding/UnderstandingEditor";

export const resolveConfigEditor = (
    component: string,
    config: Record<string, unknown>,
): React.ReactElement | null => {
    const filename = config.filename as string;
    switch (component) {
        case "physics":
            return <ImpulseSettingsEditor filename={filename} />;
        case "game_config":
            return <GameConfigEditor filename={filename} />;
        case "background_config":
            return <BackgroundConfigEditor filename={filename} />;
        case "vein_config":
            return <VeinConfigEditor filename={filename} />;
        case "world_entity":
            return <WorldEntityEditor filename={filename} />;
        case "traits":
            return <TraitsEditor filename={filename} />;
        case "conditions":
            return <ConditionsEditor filename={filename} />;
        case "guidances":
            return <GuidancesEditor filename={filename} />;
        case "tutorials":
            return <TutorialsEditor filename={filename} />;
        case "knowledge":
            return <KnowledgeEditor filename={filename} />;
        case "understanding":
            return <UnderstandingEditor filename={filename} />;
        case "camera_world":
            return <CameraWorldConfigEditor filename={filename} />;
        case "carrier":
            return <CarrierEditor filename={filename} />;
        case "body":
            return <BodyEditor filename={filename} />;
        default:
            return null;
    }
};

