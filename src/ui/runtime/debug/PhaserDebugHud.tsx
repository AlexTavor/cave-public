import { buildPhaserDebugHudView } from "./buildPhaserDebugHudView";
import { usePhaserDebugEnabled } from "./usePhaserDebugEnabled";
import { usePhaserDebugGlobals } from "./usePhaserDebugGlobals";
import { usePhaserDebugSnapshots } from "./usePhaserDebugSnapshots";
import {
    EmptyState,
    HudCard,
    HudFact,
    HudGrid,
    HudPoolList,
    HudRoot,
    HudTitle,
} from "./PhaserDebugHud.styles";

export const PhaserDebugHud = () => {
    const enabled = usePhaserDebugEnabled();
    const snapshots = usePhaserDebugSnapshots(enabled);
    const globals = usePhaserDebugGlobals(enabled);
    if (!enabled) return null;
    const scenes = buildPhaserDebugHudView(snapshots, globals);

    return (
        <HudRoot>
            {scenes.length === 0 ? (
                <HudCard>
                    <HudTitle>Renderer Debug</HudTitle>
                    <EmptyState>No scene stats yet.</EmptyState>
                </HudCard>
            ) : (
                scenes.map((scene) => (
                    <HudCard key={scene.sceneId}>
                        <HudTitle>{scene.sceneId}</HudTitle>
                        <HudGrid>
                            {scene.facts.map((fact) => (
                                <HudFact key={`${scene.sceneId}-${fact.label}`}>
                                    <span>{fact.label}</span>
                                    <span>{fact.value}</span>
                                </HudFact>
                            ))}
                        </HudGrid>
                        <HudPoolList>
                            {scene.pools.map((pool) => (
                                <div key={`${scene.sceneId}-${pool}`}>
                                    {pool}
                                </div>
                            ))}
                        </HudPoolList>
                    </HudCard>
                ))
            )}
        </HudRoot>
    );
};
