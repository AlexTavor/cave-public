import type { ModuleCartridge } from "../../data/schemas/module";
import {
    isBlueprintFile,
    isScriptFile,
    selectBlueprintForFilename,
    toBlueprintModule,
    toScriptModule,
} from "./semanticModuleAdapter";
import {
    toAssetModule,
    toCaveModule,
    toDraftModule,
    toSemanticFragment,
} from "./semanticModuleFragments";
import {
    isAssetFile,
    isCaveFile,
    isDraftFile,
} from "./semanticModuleFragmentUtils";

const parseJsonIfString = (raw: unknown) =>
    typeof raw === "string" ? JSON.parse(raw) : raw;

export const readSemanticModule = (
    filename: string,
    raw: unknown,
): ModuleCartridge | null => {
    if (isBlueprintFile(filename)) {
        return toBlueprintModule(filename, parseJsonIfString(raw));
    }
    if (isScriptFile(filename)) {
        return toScriptModule(filename, typeof raw === "string" ? raw : "");
    }
    if (isCaveFile(filename)) {
        return toCaveModule(filename, parseJsonIfString(raw));
    }
    if (isAssetFile(filename)) {
        return toAssetModule(filename, parseJsonIfString(raw));
    }
    if (isDraftFile(filename)) {
        return toDraftModule(filename, parseJsonIfString(raw));
    }
    return null;
};

export const saveSemanticModule = (
    path: string,
    filename: string,
    moduleData: ModuleCartridge,
): unknown => {
    if (isBlueprintFile(filename)) {
        return selectBlueprintForFilename(filename, moduleData);
    }
    if (isScriptFile(filename)) {
        const scripts = moduleData.scripts ?? {};
        return scripts[filename] ?? scripts[path] ?? "";
    }
    if (
        isCaveFile(filename) ||
        isAssetFile(filename) ||
        isDraftFile(filename)
    ) {
        return toSemanticFragment(filename, moduleData);
    }
    return null;
};

export const parseNonSemanticModule = (raw: unknown): ModuleCartridge =>
    parseJsonIfString(raw) as ModuleCartridge;

