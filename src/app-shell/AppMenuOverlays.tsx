import { MainMenu } from "../ui/production/MainMenu";
import { NewGameDialog } from "../ui/production/main-menu/NewGameDialog";
import { AppFadeLayer } from "./AppFadeLayer";

const subtitles = [
    "A Tale Of Growth And Exploration",
    "E Pluribus Unum",
    "Something New Awakens",
    "Against the Patriarchy",
    "Predatory Innocence",
    "A Demigod's Childhood",
    "Explore, Unite, Absorb",
    "A Purr in the Mountains",
];

const randomSubtitle = subtitles[Math.floor(Math.random() * subtitles.length)];

interface AppMenuOverlaysProps {
    menuVisible: boolean;
    showNewGameOverlay: boolean;
    actions: React.ComponentProps<typeof MainMenu>["actions"];
    errorText: string | null;
    statusText: string;
    onNewGameBack: () => void;
    onNewGameConfirm: () => void;
}

export const AppMenuOverlays = ({
    menuVisible,
    showNewGameOverlay,
    actions,
    errorText,
    statusText,
    onNewGameBack,
    onNewGameConfirm,
}: Readonly<AppMenuOverlaysProps>) => (
    <>
        <AppFadeLayer
            visible={menuVisible}
            animationKey="menu-overlay"
            testId="menu-overlay"
            layer="overlay"
            interactive
        >
            <MainMenu
                actions={actions}
                errorText={errorText}
                statusText={statusText}
                title="Cave"
                subtitle={randomSubtitle}
            />
        </AppFadeLayer>
        <AppFadeLayer
            visible={showNewGameOverlay}
            animationKey="new-game-overlay"
            testId="new-game-overlay"
            layer="overlay"
            interactive
        >
            <NewGameDialog
                isOpen
                onBack={onNewGameBack}
                onPlay={onNewGameConfirm}
            />
        </AppFadeLayer>
    </>
);
