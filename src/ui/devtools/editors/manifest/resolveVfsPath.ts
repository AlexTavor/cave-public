import { vfs } from "../../../../engine/vfs/FileSystem";

const normalize = (path: string) =>
    path.replaceAll("\\", "/").replace(/^\/+/, "");

export const resolveVfsPath = async (path: string) => {
    const wanted = normalize(path);
    const files = await vfs.listFiles();
    const exact = files.find((file) => normalize(file) === wanted);
    if (exact) return exact;
    const bySuffix = files.find((file) =>
        normalize(file).endsWith(`/${wanted}`),
    );
    return bySuffix ?? null;
};
