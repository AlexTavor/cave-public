import type { CommandDefinition } from "../../../../lib/terminal";
import { getRuntimeStore } from "../../state/runtimeStoreAccessor";

export const gameSaveCommand: CommandDefinition = {
  name: "game.save",
  description: "Save current game state to a named slot",
  usage: "game.save [name]",
  execute: async (args) => {
    const targetName = args[0] || undefined;
    try {
      await getRuntimeStore().saveGame(targetName);
      const used = targetName ?? getRuntimeStore().currentSaveName;
      return {
        type: "success",
        content: `Game saved as "${used}".`,
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { type: "error", content: message };
    }
  },
  autocomplete: (args) => {
    const saves = getRuntimeStore().availableSaves;
    const prefix = args[0] ?? "";
    return saves
      .filter((s) => s.startsWith(prefix))
      .map((s) => ({ label: s, type: "value" as const }));
  },
};
