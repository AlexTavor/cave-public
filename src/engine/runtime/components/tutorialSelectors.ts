import type {
    TutorialComponent,
    TutorialGuidanceBinding,
} from "./TutorialComponent";

const hasTargetOptionId = (
    binding: TutorialGuidanceBinding,
): binding is TutorialGuidanceBinding & { targetOptionId: string } =>
    typeof binding.targetOptionId === "string" &&
    binding.targetOptionId.length > 0;

export const getActiveDraftGuidanceTargetOptionId = (
    tutorial: Pick<TutorialComponent, "active" | "bindings"> | null | undefined,
) => {
    if (!tutorial?.active) return null;
    return tutorial.bindings.find(hasTargetOptionId)?.targetOptionId ?? null;
};
