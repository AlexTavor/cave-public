import { MenuButtonLayer, OverlayLayer, RuntimeLayer } from "../App.styles";
import { MenuAccessButton } from "../ui/production/main-menu/MenuAccessButton";
import { MenuAmbientRuntime } from "../ui/runtime/ambient/MenuAmbientRuntime";
import { PhaserDebugHud } from "../ui/runtime/debug/PhaserDebugHud";
import { RuntimeShell } from "../ui/runtime/shell/RuntimeShell";
import { AppFadeLayer } from "./AppFadeLayer";
import { MouseBlocker } from "./MouseBlocker";

interface AppRuntimeLayersProps {
    chrome: "full" | "minimal";
    menuVisible: boolean;
    menuButtonVisible: boolean;
    manifestPath: string | null;
    onOpenMenu: () => void;
}

export const AppRuntimeLayers = ({
    chrome,
    menuVisible,
    menuButtonVisible,
    manifestPath,
    onOpenMenu,
}: Readonly<AppRuntimeLayersProps>) => (
    <>
        <RuntimeLayer data-testid="runtime-layer">
            <RuntimeShell chrome={chrome} hiddenUntilTick={2} />
        </RuntimeLayer>
        <AppFadeLayer
            visible={menuVisible}
            animationKey="ambient-layer"
            testId="ambient-layer"
            layer="ambient"
        >
            <MenuAmbientRuntime manifestPath={manifestPath} />
        </AppFadeLayer>
        <OverlayLayer>
            <PhaserDebugHud />
        </OverlayLayer>
        <MenuButtonLayer>
            <MouseBlocker>
                <MenuAccessButton
                    onOpenMenu={onOpenMenu}
                    tooltipText="Open menu"
                    visible={menuButtonVisible}
                />
            </MouseBlocker>
        </MenuButtonLayer>
    </>
);
