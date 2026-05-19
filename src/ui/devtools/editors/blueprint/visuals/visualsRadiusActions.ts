export const createRadiusVisualActions = (
    mutatePresence: (recipe: (presence: any) => void) => void,
) => ({
    updateRadiusMin: (value: number) =>
        mutatePresence((presence) => {
            presence.radius.min = value;
        }),
    updateRadiusMax: (value: number) =>
        mutatePresence((presence) => {
            presence.radius.max = value;
        }),
});
