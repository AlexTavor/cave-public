import type { EditorAbilities } from "../../../data/schemas/abilities";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  message: string;
  ability: string;
}

export interface CollisionDetectorOptions {
  blueprintIds?: string[];
  stateKeys?: string[];
  reservedStateKeys?: string[];
}

export interface CollisionRule {
  id: string;
  check: (abilities: EditorAbilities) => ValidationIssue[];
}
