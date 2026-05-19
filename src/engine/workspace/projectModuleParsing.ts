import { ZodError } from "zod";
import { ModuleCartridgeSchema } from "../../data/schemas/module";
import {
    parseNonSemanticModule,
    readSemanticModule,
} from "../../lib/modules/semanticModuleIo";

const encodePointerSegment = (segment: string) =>
    segment.replaceAll("~", "~0").replaceAll("/", "~1");

const toJsonPointer = (path: Array<string | number>) =>
    path.length === 0
        ? ""
        : `/${path.map((part) => encodePointerSegment(String(part))).join("/")}`;

const formatIssue = (sourcePath: string, issue: ZodError["issues"][number]) => {
    const pointer = `${sourcePath}${toJsonPointer(issue.path as Array<string | number>)}`;
    return `${pointer}: ${issue.message}`;
};

export const parseProjectModuleFile = (file: string, raw: unknown) => {
    const semantic = readSemanticModule(file, raw);
    if (semantic) return semantic;
    const parsed = ModuleCartridgeSchema.safeParse(parseNonSemanticModule(raw));
    return parsed.success ? parsed.data : null;
};

export const formatProjectModuleParseError = (
    sourcePath: string,
    error: unknown,
): string => {
    if (!(error instanceof ZodError)) {
        return error instanceof Error
            ? `Failed parsing '${sourcePath}': ${error.message}`
            : `Failed parsing '${sourcePath}'.`;
    }
    const issues = error.issues.map((issue) => formatIssue(sourcePath, issue));
    return [`Failed parsing '${sourcePath}'.`, ...issues].join("\n");
};

export type { ModuleCartridge } from "../../data/schemas/module";
