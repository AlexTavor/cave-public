export interface ModuleExplorerProps {
    filename: string;
}

export type ViewMode = "grid" | "list";

export interface BlueprintEntry {
    id: string;
    label: string;
    iconId: string;
}
