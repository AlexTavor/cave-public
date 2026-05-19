import type { BlueprintV2 } from "./types";
import { LinkerParseError, LinkerValidationError } from "./errors";
import { resolveId } from "./utils/namespaces";

export const extensionOf = (value: string) => {
    const match = /\.[^/.]+$/u.exec(value);
    return match ? match[0].toLowerCase() : "";
};

export const parseJsonOrThrow = (path: string, value: string): unknown => {
    try {
        return JSON.parse(value);
    } catch (error) {
        throw new LinkerParseError(
            path,
            error instanceof Error ? error.message : String(error),
        );
    }
};

export const namespaceBlueprints = (
    input: Record<string, Omit<BlueprintV2, "id"> & { id?: string }>,
    namespace: string,
    path: string,
): Record<string, BlueprintV2> => {
    const output: Record<string, BlueprintV2> = {};
    for (const [registryId, blueprint] of Object.entries(input)) {
        const explicitId =
            typeof blueprint.id === "string" && blueprint.id.trim().length > 0
                ? blueprint.id.trim()
                : null;
        const resolvedId = explicitId ?? resolveId(registryId, namespace);

        if (output[resolvedId]) {
            throw new LinkerValidationError(
                path,
                `Duplicate blueprint id '${resolvedId}' in same file.`,
            );
        }
        output[resolvedId] = { ...blueprint, id: resolvedId };
    }
    return output;
};
