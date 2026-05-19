import type { EditorAbilities } from "../../../data/schemas/abilities";
import type { ValidationIssue } from "./collisionDetector.types";

const isValidResource = (value: string | undefined): boolean =>
  !!value && value.trim().length > 0;

const buildIssue = (
  id: string,
  ability: string,
  message: string,
): ValidationIssue => ({
  id,
  severity: "error",
  ability,
  message,
});

const collectResourceIssues = (
  entries: Array<{ resource: string }> | undefined,
  ability: string,
  message: string,
): ValidationIssue[] => {
  return (entries ?? []).flatMap((entry, index) =>
    isValidResource(entry.resource)
      ? []
      : [buildIssue(`${ability}_invalid_${index}`, ability, message)],
  );
};

const collectConversionIssues = (
  entries: EditorAbilities["conversion"] | undefined,
): ValidationIssue[] => {
  return (entries ?? []).flatMap((entry, index) => {
    const inputs = Array.isArray(entry.inputs) ? entry.inputs : [];
    const outputs = Array.isArray(entry.outputs) ? entry.outputs : [];
    const hasInvalid =
      inputs.some((item) => !isValidResource(item.resource)) ||
      outputs.some((item) => !isValidResource(item.resource));
    return hasInvalid
      ? [
          buildIssue(
            `conversion_invalid_${index}`,
            "conversion",
            "Conversion entries with missing resources will be removed on save.",
          ),
        ]
      : [];
  });
};

const collectStringIssues = (
  entries: Array<{ value?: string }> | undefined,
  ability: string,
  message: string,
): ValidationIssue[] =>
  (entries ?? []).flatMap((entry, index) =>
    isValidResource(entry.value)
      ? []
      : [buildIssue(`${ability}_invalid_${index}`, ability, message)],
  );

export const getMalformedAbilityIssues = (
  abilities: EditorAbilities | undefined,
): ValidationIssue[] => {
  return [
    ...collectResourceIssues(
      abilities?.storage,
      "storage",
      "Storage entry missing resource will be removed on save.",
    ),
    ...collectResourceIssues(
      abilities?.production,
      "production",
      "Production entry missing resource will be removed on save.",
    ),
    ...collectResourceIssues(
      abilities?.upkeep,
      "upkeep",
      "Upkeep entry missing resource will be removed on save.",
    ),
    ...collectConversionIssues(abilities?.conversion),
    ...collectStringIssues(
      abilities?.spawner?.map((entry) => ({ value: entry.blueprintId })),
      "spawner",
      "Spawner entry missing blueprintId will be removed on save.",
    ),
    ...collectStringIssues(
      abilities?.sampler?.map((entry) => ({ value: entry.source })),
      "sampler",
      "Sampler entry missing source will be removed on save.",
    ),
  ];
};
