import { MainMenuPanel } from "./main-menu/MainMenuPanel";
import type { MainMenuActionModel } from "./main-menu/models";

export interface MainMenuProps {
    title: string;
    subtitle: string;
    statusText: string;
    errorText: string | null;
    actions: MainMenuActionModel[];
}

export const MainMenu = (props: MainMenuProps) => <MainMenuPanel {...props} />;
