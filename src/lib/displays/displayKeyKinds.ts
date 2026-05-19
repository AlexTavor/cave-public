export enum DisplayPaletteKey {
    Body = "body",
    Mind = "mind",
    Social = "social",
    Gold = "gold",
    Green = "green",
    Red = "red",
    Purple = "purple",
}

export const DISPLAY_PALETTE_KEYS = [
    DisplayPaletteKey.Body,
    DisplayPaletteKey.Mind,
    DisplayPaletteKey.Social,
    DisplayPaletteKey.Gold,
    DisplayPaletteKey.Green,
    DisplayPaletteKey.Red,
    DisplayPaletteKey.Purple,
] as const;

export type AttributeDisplayPaletteKey =
    | DisplayPaletteKey.Body
    | DisplayPaletteKey.Mind
    | DisplayPaletteKey.Social;

export type DisplayPaletteColors = Record<DisplayPaletteKey, string>;
export type DisplayPaletteOption = { key: DisplayPaletteKey; color: string };

export const DISPLAY_PALETTE_DEFAULT_COLORS: DisplayPaletteColors = {
    [DisplayPaletteKey.Body]: "#e91e63",
    [DisplayPaletteKey.Mind]: "#2196f3",
    [DisplayPaletteKey.Social]: "#ffc107",
    [DisplayPaletteKey.Gold]: "#ff9800",
    [DisplayPaletteKey.Green]: "#4caf50",
    [DisplayPaletteKey.Red]: "#f44336",
    [DisplayPaletteKey.Purple]: "#8888ff",
};

type DisplaySettings =
    | {
          vein_network?: {
              colors?: Partial<
                  Record<"base_body" | "base_mind" | "base_social", string>
              >;
          };
      }
    | null
    | undefined;

export const readDisplayPaletteColors = (
    settings: DisplaySettings,
): DisplayPaletteColors => ({
    ...DISPLAY_PALETTE_DEFAULT_COLORS,
    [DisplayPaletteKey.Body]:
        settings?.vein_network?.colors?.base_body ??
        DISPLAY_PALETTE_DEFAULT_COLORS[DisplayPaletteKey.Body],
    [DisplayPaletteKey.Mind]:
        settings?.vein_network?.colors?.base_mind ??
        DISPLAY_PALETTE_DEFAULT_COLORS[DisplayPaletteKey.Mind],
    [DisplayPaletteKey.Social]:
        settings?.vein_network?.colors?.base_social ??
        DISPLAY_PALETTE_DEFAULT_COLORS[DisplayPaletteKey.Social],
});

export const readDisplayPaletteOptions = (
    settings: DisplaySettings,
): DisplayPaletteOption[] => {
    const colors = readDisplayPaletteColors(settings);
    return DISPLAY_PALETTE_KEYS.map((key) => ({ key, color: colors[key] }));
};

export const isAttributeDisplayKey = (displayKey: string): boolean =>
    displayKey === "attr_body" ||
    displayKey === "attr_mind" ||
    displayKey === "attr_social";

export const isBuiltInDisplayKey = (displayKey: string): boolean =>
    displayKey === "unknown" ||
    displayKey === "generic_node" ||
    displayKey === "loading" ||
    displayKey === "veins_display" ||
    displayKey === "body_avatar" ||
    displayKey === "swarm_avatar" ||
    displayKey === "cave_level" ||
    isAttributeDisplayKey(displayKey) ||
    displayKey.startsWith("menu_ambient_entity_");
