const hasScheme = (value: string) => /^[a-z]+:/i.test(value);

const joinBaseUrl = (path: string) => {
    const baseUrl = import.meta.env.BASE_URL;
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return `${normalizedBase}${path.replace(/^\/+/, "")}`;
};

export const resolveTutorialGifSrc = (raw: string): string => {
    if (!raw) return "";
    if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
    if (hasScheme(raw)) return raw;
    return joinBaseUrl(raw);
};
