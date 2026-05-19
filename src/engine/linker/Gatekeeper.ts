import {
    ModuleCartridgeSchema,
    type ModuleCartridge,
} from "../../data/schemas/module";
import { buildBlueprintHeaders } from "../registry/referenceIndex";
import type { BrokenReference } from "../registry/types";
import { ModuleLinker } from "./ModuleLinker";

export class ValidationError extends Error {
    constructor(
        public readonly brokenRefs: BrokenReference[],
        public readonly schemaErrors: string[],
    ) {
        super("Validation Failed");
    }
}

const FQ_REF = /^[^:\s]+::[^\s]+$/;

const collectRefs = (
    node: unknown,
    path: string,
    refs: Array<{ targetId: string; path: string }>,
): void => {
    if (typeof node === "string") {
        if (FQ_REF.test(node) && !path.endsWith(".id"))
            refs.push({ targetId: node, path });
        return;
    }
    if (Array.isArray(node)) {
        node.forEach((item, index) =>
            collectRefs(item, `${path}[${index}]`, refs),
        );
        return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(
        node as Record<string, unknown>,
    )) {
        collectRefs(value, `${path}.${key}`, refs);
    }
};

export class Gatekeeper {
    constructor(private readonly linker: ModuleLinker) {}

    async validatePayload(
        currentModules: Record<string, ModuleCartridge>,
        filename: string,
        payload: ModuleCartridge,
    ): Promise<void> {
        const linkerReady = typeof this.linker.linkProject === "function";
        if (!linkerReady) throw new Error("Linker unavailable");
        const virtualState = { ...currentModules, [filename]: payload };
        const parsed = ModuleCartridgeSchema.safeParse(payload);
        const schemaErrors = parsed.success
            ? []
            : parsed.error.issues.map(
                  (issue) => `${issue.path.join(".")}: ${issue.message}`,
              );

        const existingIds = new Set<string>();
        Object.values(virtualState).forEach((mod) => {
            Object.keys(buildBlueprintHeaders(mod)).forEach((id) =>
                existingIds.add(id),
            );
            Object.keys(mod.draftOptions ?? {}).forEach((id) =>
                existingIds.add(id),
            );
        });

        const refs: Array<{ targetId: string; path: string }> = [];
        collectRefs(payload, "module", refs);
        const brokenRefs: BrokenReference[] = refs
            .filter((ref) => !existingIds.has(ref.targetId))
            .map((ref) => ({
                missingId: ref.targetId,
                fromId: filename,
                fromLabel: filename,
                path: ref.path,
                value: ref.targetId,
            }));

        if (schemaErrors.length > 0 || brokenRefs.length > 0) {
            throw new ValidationError(brokenRefs, schemaErrors);
        }
    }
}
