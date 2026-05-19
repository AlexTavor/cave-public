import type { Blueprint } from "../../data/schemas/blueprint";
import { deepClone } from "../../utils/objectUtils";
import { cycleCompiler } from "./abilities/cycleCompiler";
import { storageCompiler } from "./abilities/storageCompiler";
import { productionCompiler } from "./abilities/productionCompiler";
import { injectionCompiler } from "./abilities/injectionCompiler";
import { conversionCompiler } from "./abilities/conversionCompiler";
import { upkeepCompiler } from "./abilities/upkeepCompiler";
import { assignmentCompiler } from "./abilities/assignmentCompiler";
import { spawnerCompiler } from "./abilities/spawnerCompiler";
import { samplerCompiler } from "./abilities/samplerCompiler";
import { draftCompiler } from "./abilities/draftCompiler";
import { updaterCompiler } from "./abilities/updaterCompiler";
import { triggeredActionsCompiler } from "./abilities/triggeredActionsCompiler";
import { bodyCompiler } from "./abilities/bodyCompiler";
import { appendBodyHealthBar } from "./abilities/bodyCompilerBar";
import { passportCompiler } from "./abilities/passportCompiler";
import { spatialCompiler } from "./abilities/spatialCompiler";
import { notificationCompiler } from "./abilities/notificationCompiler";
import { prepareConditionalActivation } from "./abilities/conditionalActivationCompiler";
import { reconcileStorageCompilerArtifacts } from "./abilities/storageCompilerReconciler";
import { prepareAssignmentCompletionTrigger } from "./abilities/assignmentCompletionCompiler";
import { suspiciousActivityCompiler } from "./abilities/suspiciousActivityCompiler";

export class CompilerService {
    public compile(blueprint: Blueprint): Blueprint {
        const draft = deepClone(blueprint);
        if (!draft._editor) return draft;

        const behavior = draft.components?.behavior;
        if (behavior?.rules) {
            behavior.rules = behavior.rules.filter(
                (rule) =>
                    !rule.id?.startsWith("sys_") &&
                    !rule.id?.startsWith("body_"),
            );
        }

        const abilities = draft._editor.abilities;
        if (!abilities) return draft;
        prepareConditionalActivation(draft, abilities);
        const conditionalActivation = abilities.conditionalActivation;
        if (abilities.body) bodyCompiler(draft, abilities.body);
        if (abilities.passport) passportCompiler(draft, abilities.passport);
        if (abilities.body) appendBodyHealthBar(draft);
        if (abilities.worldPresence)
            spatialCompiler(draft, abilities.worldPresence);
        const cycleConfig = abilities.cycle;
        if (cycleConfig) cycleCompiler(draft, cycleConfig, abilities);
        const spawnerConfigs = abilities.spawner ?? [];
        spawnerConfigs.forEach((config, index) =>
            spawnerCompiler(draft, config, index, conditionalActivation),
        );
        const samplerConfigs = abilities.sampler ?? [];
        samplerConfigs.forEach((config, index) =>
            samplerCompiler(draft, config, index, conditionalActivation),
        );
        const storageConfigs = abilities.storage ?? [];
        reconcileStorageCompilerArtifacts(draft, storageConfigs);
        storageConfigs.forEach((config, index) =>
            storageCompiler(draft, config, index, index === 0),
        );
        const productionConfigs = abilities.production ?? [];
        productionConfigs.forEach((config, index) =>
            productionCompiler(draft, config, index, conditionalActivation),
        );
        const conversionConfigs = abilities.conversion ?? [];
        conversionConfigs.forEach((config, index) =>
            conversionCompiler(draft, config, index, conditionalActivation),
        );
        const upkeepConfigs = abilities.upkeep ?? [];
        upkeepConfigs.forEach((config, index) =>
            upkeepCompiler(draft, config, index),
        );
        const injectionConfigs = abilities.injection ?? [];
        if (injectionConfigs.length > 0)
            injectionCompiler(draft, injectionConfigs);
        const assignmentConfig = abilities.assignment;
        if (assignmentConfig)
            assignmentCompiler(draft, assignmentConfig, abilities);
        if (assignmentConfig) prepareAssignmentCompletionTrigger(draft);
        const draftConfigs = abilities.draft ?? [];
        draftConfigs.forEach((config, index) =>
            draftCompiler(draft, config, index, conditionalActivation),
        );
        const updaterConfigs = abilities.updater ?? [];
        updaterConfigs.forEach((config, index) =>
            updaterCompiler(draft, config, index, conditionalActivation),
        );
        const triggeredActionsConfigs = abilities.triggeredActions ?? [];
        triggeredActionsConfigs.forEach((config, index) =>
            triggeredActionsCompiler(
                draft,
                config,
                index,
                conditionalActivation,
            ),
        );
        if (abilities.notifications)
            notificationCompiler(draft, abilities.notifications);
        suspiciousActivityCompiler(draft, abilities);
        return draft;
    }
}

