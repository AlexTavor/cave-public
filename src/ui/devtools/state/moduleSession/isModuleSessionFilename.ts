export const isModuleSessionFilename = (
    filename: string | null | undefined,
): filename is string =>
    Boolean(
        filename &&
        /\.(json|bp|art|cave|draft|cvs)$/i.test(filename) &&
        !filename.toLowerCase().endsWith("manifest.json"),
    );
