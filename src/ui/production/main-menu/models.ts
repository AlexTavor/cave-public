export interface MainMenuActionModel {
    id: "new-game" | "continue" | "save" | "load" | "devtools";
    label: string;
    description: string;
    disabled: boolean;
    onSelect: () => void;
    tone: "primary" | "default";
}
