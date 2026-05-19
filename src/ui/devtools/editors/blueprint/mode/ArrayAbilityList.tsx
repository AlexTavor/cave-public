import type { EditorAbilities } from "../../../../../data/schemas/abilities";
import { normalizeConditionalActivationConfigs } from "../../../../../data/schemas/abilities/conditionalActivation";
import type { ArrayAbilityKey } from "./abilityListMutations";
import {
    ConversionAbilitySection,
    ProductionAbilitySection,
    StorageAbilitySection,
    UpkeepAbilitySection,
    DraftAbilitySection,
} from "./AbilityListSections";
import { ConditionalActivationAbilitySection } from "./ConditionalActivationAbilitySection";
import { NotificationAbilitySection } from "./NotificationAbilitySection";
import { SamplerAbilitySection } from "./SamplerAbilitySection.tsx";
import { SpawnerAbilitySection } from "./SpawnerAbilitySection.tsx";
import { TriggeredActionsAbilitySection } from "./TriggeredActionsAbilitySection";
import { UnifiedBlueprintsAbilitySection } from "./UnifiedBlueprintsAbilitySection";
import { UpdaterAbilitySection } from "./UpdaterAbilitySection.tsx";

interface ArrayAbilityListProps {
    abilities: EditorAbilities;
    rootPath: string;
    onRemoveItem: (ability: ArrayAbilityKey, index: number) => void;
}

export function ArrayAbilityList({
    abilities,
    rootPath,
    onRemoveItem,
}: Readonly<ArrayAbilityListProps>) {
    const removeItem = (ability: ArrayAbilityKey) =>
        onRemoveItem.bind(null, ability);

    return (
        <>
            <StorageAbilitySection
                entries={abilities.storage ?? []}
                rootPath={rootPath}
                onRemoveItem={removeItem("storage")}
            />
            <ProductionAbilitySection
                entries={abilities.production ?? []}
                rootPath={rootPath}
                onRemoveItem={removeItem("production")}
            />
            <ConversionAbilitySection
                entries={abilities.conversion ?? []}
                rootPath={rootPath}
                onRemoveItem={removeItem("conversion")}
            />
            <UpkeepAbilitySection
                entries={abilities.upkeep ?? []}
                rootPath={rootPath}
                onRemoveItem={removeItem("upkeep")}
            />
            <SpawnerAbilitySection
                entries={abilities.spawner ?? []}
                rootPath={rootPath}
                onRemoveItem={removeItem("spawner")}
            />
            <SamplerAbilitySection
                entries={abilities.sampler ?? []}
                rootPath={rootPath}
                onRemoveItem={removeItem("sampler")}
            />
            <DraftAbilitySection
                entries={abilities.draft ?? []}
                rootPath={rootPath}
                onRemoveItem={removeItem("draft")}
            />
            <ConditionalActivationAbilitySection
                entries={normalizeConditionalActivationConfigs(
                    abilities.conditionalActivation,
                )}
                rootPath={rootPath}
                onRemoveItem={removeItem("conditionalActivation")}
            />
            <TriggeredActionsAbilitySection
                entries={abilities.triggeredActions ?? []}
                rootPath={rootPath}
                onRemoveItem={removeItem("triggeredActions")}
            />
            <UpdaterAbilitySection
                entries={abilities.updater ?? []}
                rootPath={rootPath}
                onRemoveItem={removeItem("updater")}
            />
            <NotificationAbilitySection
                entries={abilities.notifications ?? []}
                rootPath={rootPath}
                onRemoveItem={removeItem("notifications")}
            />
            <UnifiedBlueprintsAbilitySection
                entries={abilities.unifiedBlueprints ?? []}
                rootPath={rootPath}
                onRemoveItem={removeItem("unifiedBlueprints")}
            />
        </>
    );
}

