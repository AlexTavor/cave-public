import { z } from "zod";
import { LinkerParseError, LinkerValidationError } from "./errors";
import {
    compileRuntimeBlueprints,
    createRuntimeCartridge,
    mergeSemanticFragment,
} from "./moduleLinkerRuntime";
import { parseSemanticFragment, type SemanticFragment } from "./semanticParser";
import { extensionOf, parseJsonOrThrow } from "./linkerUtils";
import type { RuntimeCartridge } from "./types";

const ManifestSchema = z.object({ files: z.array(z.string()).default([]) });
const SEMANTIC_EXTENSIONS = new Set([".cave", ".draft", ".art", ".bp"]);

type Reader = {
    readText: (path: string) => Promise<string | null>;
    readFile?: (path: string) => Promise<unknown>;
};

type Logger = {
    warn: (message: string) => void;
    debug: (message: string) => void;
};

type LoadedFragment = {
    fragment: SemanticFragment;
    namespace: string;
    path: string;
};

export class ModuleLinker {
    constructor(
        private readonly fs: Reader,
        private readonly logger: Logger = console,
    ) {}

    private async readJson(path: string): Promise<unknown> {
        if (this.fs.readFile) {
            const raw = await this.fs.readFile(path);
            if (raw !== undefined && raw !== null) {
                return typeof raw === "string"
                    ? parseJsonOrThrow(path, raw)
                    : raw;
            }
        }
        const text = await this.fs.readText(path);
        if (text !== null) return parseJsonOrThrow(path, text);
        return null;
    }

    private async readManifest(rootPath: string): Promise<string[]> {
        const path = `${rootPath}/manifest.json`;
        const raw = await this.readJson(path);
        if (raw === null) throw new LinkerParseError(path, "Missing file.");
        const parsed = ManifestSchema.safeParse(raw);
        if (!parsed.success) {
            throw new LinkerValidationError(
                path,
                parsed.error.issues[0]?.message ?? "Invalid manifest.",
            );
        }
        return parsed.data.files;
    }

    private async readFragment(
        rootPath: string,
        file: string,
    ): Promise<LoadedFragment | null> {
        const path = `${rootPath}/${file}`;
        const extension = extensionOf(file);
        if (!SEMANTIC_EXTENSIONS.has(extension)) {
            this.logger.warn(`[Linker] Ignored unsupported file type: ${path}`);
            return null;
        }
        const raw = await this.readJson(path);
        if (raw === null) throw new LinkerParseError(path, "Missing file.");
        return {
            fragment: parseSemanticFragment(path, extension, raw),
            namespace: file.replace(/\.[^/.]+$/, ""),
            path,
        };
    }

    public async linkProject(rootPath: string): Promise<RuntimeCartridge> {
        const runtime = createRuntimeCartridge(rootPath);
        for (const file of await this.readManifest(rootPath)) {
            const loaded = await this.readFragment(rootPath, file);
            if (!loaded) continue;
            mergeSemanticFragment(
                runtime,
                loaded.fragment,
                loaded.namespace,
                loaded.path,
                (message) => this.logger.debug(message),
            );
        }
        compileRuntimeBlueprints(runtime);
        return runtime;
    }
}

