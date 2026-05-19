interface SceneEventHub {
    once(event: string, listener: () => void): void;
    off(event: string, listener: () => void): void;
}

interface SceneWithEvents {
    events: SceneEventHub;
}

const SHUTDOWN_EVENT = "shutdown";
const DESTROY_EVENT = "destroy";

export const registerGameSceneShutdown = (
    scene: SceneWithEvents,
    onShutdown: () => void,
): void => {
    let cleaned = false;
    const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        scene.events.off(SHUTDOWN_EVENT, cleanup);
        scene.events.off(DESTROY_EVENT, cleanup);
        onShutdown();
    };

    scene.events.once(SHUTDOWN_EVENT, cleanup);
    scene.events.once(DESTROY_EVENT, cleanup);
};
