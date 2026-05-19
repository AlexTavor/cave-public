/**
 * Bumps a semantic version string (MAJOR.MINOR.PATCH).
 * Defaults to bumping the PATCH version.
 * e.g., "0.0.1" -> "0.0.2"
 */
export const bumpVersion = (version: string): string => {
    if (!version) return "0.0.1";

    const parts = version.split(".").map(Number);

    // Handle malformed strings gracefully
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return version; // Fail safe, don't change
    }

    const [major, minor, patch] = parts;
    return `${major}.${minor}.${patch + 1}`;
};
