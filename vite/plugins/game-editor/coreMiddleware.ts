import fs from "node:fs";
import path from "node:path";
import { parse } from "node:querystring";
import type { ViteDevServer } from "vite";
import {
    DATA_SOURCE_DIR,
    PROJECT_ROOT,
    isAllowedReadPath,
    isAllowedSavePath,
    parseBody,
    sendJson,
} from "./shared";
import { discoverModulesRecursively } from "./moduleDiscovery";
import { readEditorContent } from "./readContent";

export const registerCoreEditorMiddleware = (server: ViteDevServer) => {
    server.middlewares.use("/__editor/list", async (_req, res) => {
        try {
            sendJson(res, await discoverModulesRecursively(DATA_SOURCE_DIR));
        } catch (error) {
            console.error("[GameEditor] List Error:", error);
            res.statusCode = 500;
            sendJson(res, { error: String(error) });
        }
    });

    server.middlewares.use("/__editor/read", (req, res, next) => {
        if (req.method !== "GET") return next();
        const relativePath = parse(req.url?.split("?")[1] || "").path as string;
        const fullPath = path.resolve(PROJECT_ROOT, relativePath || "");
        if (!relativePath) {
            res.statusCode = 400;
            res.end("Missing path");
            return;
        }
        if (!isAllowedReadPath(fullPath)) {
            res.statusCode = 403;
            res.end("Access denied");
            return;
        }
        if (!fs.existsSync(fullPath)) {
            res.statusCode = 404;
            res.end("File not found");
            return;
        }
        const content = readEditorContent(fullPath);
        if (typeof content === "string") {
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end(content);
            return;
        }
        sendJson(res, content);
    });

    server.middlewares.use("/__editor/save", (req, res, next) => {
        if (req.method !== "POST") return next();
        void parseBody(req)
            .then(({ path: relativePath, content }) => {
                const fullPath = path.resolve(PROJECT_ROOT, relativePath);
                if (!isAllowedSavePath(fullPath)) {
                    res.statusCode = 403;
                    res.end("Access denied");
                    return;
                }
                fs.mkdirSync(path.dirname(fullPath), { recursive: true });
                fs.writeFileSync(
                    fullPath,
                    typeof content === "string"
                        ? content
                        : JSON.stringify(content, null, 2),
                );
                sendJson(res, { success: true });
            })
            .catch((error) => {
                console.error("[GameEditor] Save Error:", error);
                res.statusCode = 500;
                sendJson(res, { error: String(error) });
            });
    });
};
