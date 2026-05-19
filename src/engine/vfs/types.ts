export interface MoveItem {
    from: string;
    to: string;
}

export interface ScanOptions {
    glob?: string;
    recursive?: boolean;
}

export interface TreeNode {
    name: string;
    path: string;
    type: "file" | "directory";
    children?: TreeNode[];
}

export interface BatchResult {
    success: boolean;
    modified: string[];
    errors: string[];
}
