import type { MainMenuActionModel } from "../ui/production/main-menu/models";
import type { AppShellMenuOrigin } from "./useAppShellStore";

interface ActionBuilderParams {
    canStartNewGame: boolean;
    canContinue: boolean;
    continueDescription: string;
    menuOrigin: AppShellMenuOrigin;
    onNewGame: () => void;
    onContinue: () => void;
    onSave: () => void;
    onLoad: () => void;
    onDevtools: () => void;
}

const makeAction = (
    id: MainMenuActionModel["id"],
    label: string,
    description: string,
    onSelect: () => void,
    disabled = false,
    tone: MainMenuActionModel["tone"] = "default",
): MainMenuActionModel => ({
    id,
    label,
    description,
    disabled,
    onSelect,
    tone,
});

export const buildMainMenuActions = ({
    canStartNewGame,
    canContinue,
    continueDescription,
    menuOrigin,
    onNewGame,
    onContinue,
    onSave,
    onLoad,
    onDevtools,
}: ActionBuilderParams): MainMenuActionModel[] => {
    const sessionActions = canContinue
        ? [
              makeAction(
                  "continue",
                  "CONTINUE",
                  continueDescription,
                  onContinue,
                  false,
                  "primary",
              ),
              ...(menuOrigin === "game"
                  ? [
                        makeAction(
                            "save",
                            "SAVE",
                            "Write the current runtime state.",
                            onSave,
                        ),
                    ]
                  : []),
          ]
        : [];

    return [
        ...sessionActions,
        makeAction(
            "new-game",
            "NEW GAME",
            "Start from the beginning and replace the autosave.",
            onNewGame,
            !canStartNewGame,
            canContinue ? "default" : "primary",
        ),
        makeAction("load", "LOAD", "Restore a saved runtime state.", onLoad),
        makeAction(
            "devtools",
            "DEV TOOLS",
            "Open the devtools surface.",
            onDevtools,
        ),
    ];
};
