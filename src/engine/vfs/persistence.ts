export interface PersistenceAdapter<T> {
    load(key: string): Promise<T | undefined>;
    save(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    getAllKeys(): Promise<string[]>;
    exportAll?: () => Promise<Record<string, unknown>>;
    importAll?: (data: Record<string, unknown>) => Promise<void>;
    deleteMany?: (keys: string[]) => Promise<void>;
    moveMany?: (items: import("./types").MoveItem[]) => Promise<void>;
    scan?: (glob: string) => Promise<string[]>;
    getTree?: (root: string) => Promise<import("./types").TreeNode>;
}

export type FetchLike<TJsonType> = (
    input: string,
    init?: {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
    },
) => Promise<{
    ok: boolean;
    status: number;
    statusText: string;
    json(): Promise<TJsonType>;
    text(): Promise<string>;
}>;

