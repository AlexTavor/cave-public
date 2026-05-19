import type { CaveSignalDriver } from "../../../data/schemas/game/caveDisplay";

export const resolveCaveDisplayDriver = (
    driver: CaveSignalDriver,
    comfort: number,
    focus: number,
    happiness: number,
    sadness: number,
    terror: number,
    curiosity: number,
): number => {
    const value =
        driver.base +
        comfort * driver.comfortWeight +
        focus * driver.focusWeight +
        happiness * driver.happinessWeight +
        sadness * driver.sadnessWeight +
        terror * driver.terrorWeight +
        curiosity * driver.curiosityWeight;
    return Math.max(driver.min, Math.min(driver.max, value));
};
