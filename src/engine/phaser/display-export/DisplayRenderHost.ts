import Phaser from "phaser";
import { DisplayImageExportService } from "./DisplayImageExportService";
import { DisplayRenderHostScene } from "./DisplayRenderHostScene";

export interface DisplayRenderHostCallbacks {
    onServiceReady: (service: DisplayImageExportService) => void;
    onTeardown: () => void;
}

export class DisplayRenderHost {
    private game: Phaser.Game | null = null;
    private container: HTMLDivElement | null = null;
    private ready = false;

    // The host renders avatars off-screen and publishes an export service to UI
    // stores. Those store writes are injected (see the ui DisplayRenderHost
    // wrapper) so the engine host doesn't depend on ui.
    constructor(private readonly callbacks: DisplayRenderHostCallbacks) {}

    public start(): void {
        if (this.game) return;
        const scene = new DisplayRenderHostScene(() => {
            this.callbacks.onServiceReady(
                new DisplayImageExportService(scene),
            );
            this.ready = true;
        });
        this.container = document.createElement("div");
        this.container.setAttribute("aria-hidden", "true");
        this.container.style.cssText =
            "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;";
        document.body.appendChild(this.container);
        this.game = new Phaser.Game({
            type: Phaser.CANVAS,
            width: 128,
            height: 128,
            parent: this.container,
            scene: [scene],
            transparent: true,
        });
    }

    public destroy(): void {
        this.callbacks.onTeardown();
        this.ready = false;
        const scene = this.game?.scene.getScene("DisplayRenderHostScene");
        if (scene instanceof DisplayRenderHostScene)
            scene.destroyHostResources();
        this.game?.destroy(true);
        this.game = null;
        this.container?.remove();
        this.container = null;
    }

    public isReady(): boolean {
        return this.ready;
    }
}
