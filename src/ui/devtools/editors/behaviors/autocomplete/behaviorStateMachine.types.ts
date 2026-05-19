import type { Blueprint } from "../../../../../data/schemas/blueprint";
import type { ModuleCartridge } from "../../../../../data/schemas/module";
import type { Suggestion } from "../../../../../lib/terminal/types";

export interface BehaviorSuggestionSeed {
    label: string;
    insertText?: string;
    type?: Suggestion["type"];
    replace?: Suggestion["replace"];
    cursor?: Suggestion["cursor"];
}

export interface BehaviorStateMachineInput {
    tokens: string[];
    currentToken: string;
    previousToken: string;
    moduleData: ModuleCartridge | null;
    draft: Blueprint | null;
}
