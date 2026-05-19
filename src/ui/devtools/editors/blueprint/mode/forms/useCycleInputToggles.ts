import { useCallback } from "react";
import { useSessionStore } from "../../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../../utils/objectUtils";
import { getDefaultValue } from "../../../utils";
import { ScalableValueSchema } from "../../../../../../data/schemas/abilities/utils";

type InputKey = "body" | "mind" | "social";

export const useCycleInputToggles = (filename: string, basePath: string) => {
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const inputs = useSessionStore((state) => {
        const session = state.sessions[filename];
        if (!session) return {};
        return (
            (getByPath(session.draft, `${basePath}.inputs`) as Record<
                string,
                unknown
            >) ?? {}
        );
    });

    const toggleInput = useCallback(
        (key: InputKey, next: boolean) => {
            updateDraft(filename, (draft) => {
                const inputsPath = `${basePath}.inputs`;
                const nextInputs =
                    (getByPath(draft, inputsPath) as Record<string, unknown>) ??
                    {};
                if (!getByPath(draft, inputsPath)) {
                    setByPath(draft, inputsPath, nextInputs);
                }
                if (next) {
                    nextInputs[key] = getDefaultValue(ScalableValueSchema);
                } else {
                    delete nextInputs[key];
                }
            });
        },
        [basePath, filename, updateDraft],
    );

    return {
        isEnabled: (key: InputKey) => Boolean(inputs[key]),
        toggleInput,
    };
};
