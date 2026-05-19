import fs from "node:fs";
import path from "node:path";
import type { ViteDevServer } from "vite";
import {
    DATA_SOURCE_DIR,
    PROJECT_ROOT,
    isAllowedReadPath,
    parseBody,
    sendJson,
} from "./shared";
import { getDirectoryTree, scanDirectoryRecursively } from "./treeUtils";

export const registerFsEditorMiddleware = (server: ViteDevServer) => {
    server.middlewares.use("/__editor/scan", async (req, res, next) => {
        if (req.method !== "POST") return next();
        try {
            const { glob } = await parseBody(req);
            const allFiles = scanDirectoryRecursively(DATA_SOURCE_DIR);
            const suffix =
                glob && glob !== "*" && glob !== "**/*"
                    ? String(glob).replace(/^\*+/, "")
                    : null;
            sendJson(
                res,
                suffix
                    ? allFiles.filter((file) => file.endsWith(suffix))
                    : allFiles,
            );
        } catch (error) {
            console.error("[GameEditor] Scan Error:", error);
            res.statusCode = 500;
            sendJson(res, { error: String(error) });
        }
    });

    server.middlewares.use("/__editor/tree", async (req, res, next) => {
        if (req.method !== "POST") return next();
        try {
            const { root } = await parseBody(req);
            const targetPath = root
                ? path.resolve(PROJECT_ROOT, root)
                : DATA_SOURCE_DIR;
            if (!isAllowedReadPath(targetPath)) {
                res.statusCode = 403;
                sendJson(res, { error: "Access denied" });
                return;
            }
            sendJson(res, getDirectoryTree(targetPath));
        } catch (error) {
            console.error("[GameEditor] Tree Error:", error);
            res.statusCode = 500;
            sendJson(res, { error: String(error) });
        }
    });

    server.middlewares.use("/__editor/delete", async (req, res, next) => {
        if (req.method !== "DELETE") return next();
        try {
            const { paths } = await parseBody(req);
            const deleted = Array.isArray(paths)
                ? paths.filter((p) => {
                      const fullPath = path.resolve(PROJECT_ROOT, p);
                      if (
                          !isAllowedReadPath(fullPath) ||
                          !fs.existsSync(fullPath)
                      )
                          return false;
                      fs.rmSync(fullPath, { recursive: true, force: true });
                      return true;
                  })
                : [];
            sendJson(res, { success: true, deleted });
        } catch (error) {
            console.error("[GameEditor] Delete Error:", error);
            res.statusCode = 500;
            sendJson(res, { error: String(error) });
        }
    });

    server.middlewares.use("/__editor/move", async (req, res, next) => {
        if (req.method !== "POST") return next();
        try {
            const { items } = await parseBody(req);
            for (const item of Array.isArray(items) ? items : []) {
                const fromPath = path.resolve(PROJECT_ROOT, item.from);
                const toPath = path.resolve(PROJECT_ROOT, item.to);
                if (!isAllowedReadPath(fromPath) || !isAllowedReadPath(toPath))
                    throw new Error(
                        `Access denied for move: ${item.from} -> ${item.to}`,
                    );
                fs.mkdirSync(path.dirname(toPath), { recursive: true });
                fs.renameSync(fromPath, toPath);
            }
            sendJson(res, { success: true, moved: items });
        } catch (error) {
            console.error("[GameEditor] Move Error:", error);
            res.statusCode = 500;
            sendJson(res, { error: String(error) });
        }
    });
};
