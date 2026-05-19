import type { CommandDefinition } from "../../../../lib/terminal";
import { getRuntimeStore } from "../../state/runtimeStoreAccessor";

export const gameLoadCommand: CommandDefinition = {
  name: "game.load",
  description: "Load game state from a named save slot",
  usage: "game.load [name]",
  execute: async (args) => {
    const targetName = args[0] || undefined;
    try {
      await getRuntimeStore().loadGame(targetName);
      const used = targetName ?? getRuntimeStore().currentSaveName;
      return {
        type: "success",
        content: `Loaded save "${used}".`,
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
