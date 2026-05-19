import type {
    BodyAvatarImageRequest,
    DisplayImageRequest,
    NonAvatarDisplayImageRequest,
} from "./DisplayImageExportTypes";

export type ResolvedDisplayImageSpec = NonAvatarDisplayImageRequest;
export type ResolvedBodyAvatarSpec = BodyAvatarImageRequest;

const fail = (message: string): never => {
    console.error(message);
    throw new Error(message);
};

export const resolveDisplayImageSpec = (
    request: DisplayImageRequest,
): ResolvedDisplayImageSpec | ResolvedBodyAvatarSpec => {
    if (request.kind === "attribute_display" && !request.displayKey.trim()) {
        return fail("[DisplayImageExport] Empty attribute display key.");
    }
    if (request.kind === "resolved_display" && !request.displayKey.trim()) {
        return fail("[DisplayImageExport] Empty resolved display key.");
    }
    if (request.kind === "body_avatar" && !request.subjectSeed.trim()) {
        return fail("[DisplayImageExport] Empty subject seed.");
    }
    return request;
};
