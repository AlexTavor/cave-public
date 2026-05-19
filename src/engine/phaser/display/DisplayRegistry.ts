import type { DisplayDefinition } from "./moduleTypes";

export class DisplayRegistry {
    private readonly definitions = new Map<string, DisplayDefinition>();
    private readonly missingLogged = new Set<string>();
    private readonly fallback: DisplayDefinition;

    constructor(fallback: DisplayDefinition) {
        this.fallback = fallback;
    }

    public register(def: DisplayDefinition): void {
        this.definitions.set(def.display_key, def);
    }

    public resolve(display_key: string): DisplayDefinition {
        const def = this.definitions.get(display_key);
        if (def) return def;

        if (!this.missingLogged.has(display_key)) {
            this.missingLogged.add(display_key);
            console.warn(
                `[DisplayRegistry] No definition for "${display_key}". ` +
                    `Using default placeholder.`,
            );
        }

        return this.fallback;
    }

    public clear(): void {
        this.definitions.clear();
        this.missingLogged.clear();
    }
}
