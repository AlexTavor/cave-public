import type { VirtualPath } from "./virtualPath.types";
import { isRoutePrefix, PATH_SEPARATOR } from "./virtualPath.constants";
import { parseLegacyPath } from "./virtualPath.parseLegacy";
import { parseRoutedPath } from "./virtualPath.parseRouted";

const isDirectModuleFilePath = (path: string) =>
    /\.(json|bp|art|cave|draft|cvs)$/i.test(path);

export function parseVirtualPath(path: string): VirtualPath {
    const parts = path.split(PATH_SEPARATOR);
    const [first, ...segments] = parts;
    const head = first ?? "";

    if (!head) return { kind: "module", filename: "" };

    if (isRoutePrefix(head)) {
        return parseRoutedPath(head, segments);
    }
    if (isDirectModuleFilePath(path)) {
        return { kind: "module", filename: path };
    }

    return parseLegacyPath(head, segments);
}
