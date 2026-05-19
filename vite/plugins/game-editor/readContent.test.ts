import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readEditorContent } from "./readContent";

const tempFiles: string[] = [];
const makeTempFile = (name: string, content: string) => {
    const filePath = path.join(os.tmpdir(), `cave-${Date.now()}-${name}`);
    fs.writeFileSync(filePath, content);
    tempFiles.push(filePath);
    return filePath;
};

afterEach(() =>
    tempFiles.splice(0).forEach((file) => fs.rmSync(file, { force: true })),
);

describe("readEditorContent", () => {
    it("returns raw text for non-json files and parsed data for json files", () => {
        const scriptPath = makeTempFile(
            "start.cvs",
            "project-load example/manifest.json\n",
        );
        const jsonPath = makeTempFile("data.json", '{"ok":true}');
        expect(readEditorContent(scriptPath)).toBe(
            "project-load example/manifest.json\n",
        );
        expect(readEditorContent(jsonPath)).toEqual({ ok: true });
    });
});
