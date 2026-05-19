import { useCallback } from "react";
import { useSessionStore } from "../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { unwrapSchema } from "../../utils";
import { ZodType } from "zod";

export const useEnumField = (
    filename: string,
    path: string,
    schema: ZodType,
) => {
    const value = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return "";
                return (getByPath(session.draft, path) as string) || "";
            },
            [filename, path],
        ),
    );

    const updateDraft = useSessionStore((state) => state.updateDraft);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateDraft(filename, (draft) => {
            setByPath(draft, path, e.target.value);
        });
    };

    const getOptions = () => {
        const realSchema = unwrapSchema(schema);
        const def = (realSchema as any)._def || (realSchema as any).def;
        let options: string[] = [];

        if (def?.values) {
            options = def.values;
        } else if (def?.typeName === "ZodNativeEnum") {
            options = Object.values(def.values);
        } else if (def.entries) {
            options = Object.values(def.entries);
        }

        if (!Array.isArray(options)) options = [];
        return options;
    };

    return { value, handleChange, options: getOptions() };
};
