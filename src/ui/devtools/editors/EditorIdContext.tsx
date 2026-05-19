import { createContext, useContext } from "react";

export const EditorIdContext = createContext<string | null>(null);

export const useEditorId = () => {
    const id = useContext(EditorIdContext);
    if (!id) {
        throw new Error(
            "useEditorId must be used within an EditorIdContext.Provider"
        );
    }
    return id;
};
