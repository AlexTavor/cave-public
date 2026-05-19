import type { ModuleCartridge } from "../../data/schemas/module";

export type LeverType = "setting" | "state" | "behavior";

export interface LeverDefinition {
    id: string;
    type: LeverType;
    label: string;
    path: string;
    value: number;
    blueprintId?: string;
    ruleId?: string;
    target?: string;
}

const isNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

const formatLabel = (...parts: string[]) =>
    parts
        .filter(Boolean)
        .join(" ")
        .replaceAll(/[._-]+/g, " ")
        .replaceAll(/\b\w/g, (char) => char.toUpperCase());

export class Scanner {
    public scan(cartridge: ModuleCartridge): LeverDefinition[] {
        const levers: LeverDefinition[] = [];

        const pushLever = (lever: Omit<LeverDefinition, "id">) => {
            levers.push({ ...lever, id: lever.path });
        };

        const walkSettings = (node: unknown, path: string[]): void => {
            if (isNumber(node)) {
                const pathStr = path.join(".");
                pushLever({
                    type: "setting",
                    label: formatLabel(...path.slice(2)),
                    path: pathStr,
                    value: node,
                });
                return;
            }

            if (!node || typeof node !== "object") return;
            for (const [key, value] of Object.entries(node)) {
                walkSettings(value, [...path, key]);
            }
        };

        const blueprintSettings = cartridge.config?.settings;
        if (blueprintSettings) {
            walkSettings(blueprintSettings, ["blueprint", "settings"]);
        } else {
            walkSettings(cartridge.assets?.settings, ["assets", "settings"]);
        }

        for (const [blueprintId, blueprint] of Object.entries(
            cartridge.blueprints ?? {},
        )) {
            const components = blueprint.components ?? {};
            const state = components.state ?? {};
            const labelBase = blueprint.label || blueprintId;

            for (const [key, entry] of Object.entries(state)) {
                if (!entry || typeof entry !== "object") continue;
                const numeric = entry as Record<string, unknown>;

                for (const prop of ["value", "min", "max"]) {
                    const candidate = numeric[prop];
                    if (!isNumber(candidate)) continue;
                    const path = `blueprints.${blueprintId}.components.state.${key}.${prop}`;
                    pushLever({
                        type: "state",
                        label: formatLabel(labelBase, key, prop),
                        path,
                        value: candidate,
                        blueprintId,
                    });
                }
            }

            const rules = components.behavior?.rules ?? [];
            rules.forEach((rule, ruleIndex) => {
                rule.actions?.forEach((action: any, actionIndex: number) => {
                    if (action?.type !== "MUTATE") return;
                    if (!isNumber(action.value)) return;
                    const path = `blueprints.${blueprintId}.components.behavior.rules.${ruleIndex}.actions.${actionIndex}.value`;
                    pushLever({
                        type: "behavior",
                        label: formatLabel(labelBase, action.target, "Value"),
                        path,
                        value: action.value,
                        blueprintId,
                        ruleId: rule.id,
                        target: action.target,
                    });
                });
            });
        }

        return levers;
    }
}
