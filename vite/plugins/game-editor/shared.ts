import path from "node:path";
import { IncomingMessage } from "node:http";

export const PROJECT_ROOT = process.cwd();
export const DATA_SOURCE_DIR = path.join(PROJECT_ROOT, "src", "data", "raw");
export const BOOTSTRAP_OUTPUT_PATH = path.join(
    PROJECT_ROOT,
    "public",
    "bootstrap",
    "vfs-prod.json",
);

export const parseBody = async (req: IncomingMessage) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks).toString("utf-8");
    return body ? JSON.parse(body) : {};
};

const isWithinRoot = (fullPath: string, root: string) => {
    const relativePath = path.relative(root, fullPath);
    return (
        relativePath !== "" &&
        !relativePath.startsWith("..") &&
        !path.isAbsolute(relativePath)
    );
};

export const isAllowedReadPath = (fullPath: string) =>
    fullPath === DATA_SOURCE_DIR || isWithinRoot(fullPath, DATA_SOURCE_DIR);

export const isAllowedSavePath = (fullPath: string) =>
    fullPath === BOOTSTRAP_OUTPUT_PATH || isAllowedReadPath(fullPath);

export const normalizeProjectPath = (fullPath: string) =>
    path.relative(PROJECT_ROOT, fullPath).split(path.sep).join("/");

export const sendJson = (
    res: { setHeader: Function; end: Function },
    payload: unknown,
) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(payload));
};
