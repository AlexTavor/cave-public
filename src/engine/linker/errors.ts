export class LinkerParseError extends Error {
    constructor(path: string, detail: string) {
        super(`[Linker] Parse error in ${path}: ${detail}`);
        this.name = "LinkerParseError";
    }
}

export class LinkerValidationError extends Error {
    constructor(path: string, detail: string) {
        super(`[Linker] Validation error in ${path}: ${detail}`);
        this.name = "LinkerValidationError";
    }
}
