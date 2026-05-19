import Phaser from "phaser";
import { DisplayImageExportService } from "./DisplayImageExportService";
import { DisplayRenderHostScene } from "./DisplayRenderHostScene";
import { useDisplayImageExportStore } from "../../../ui/runtime/state/useDisplayImageExportStore";
import { useUiAvatarStore } from "../../../ui/runtime/state/useUiAvatarStore";

export class DisplayRenderHost {
    private game: Phaser.Game | null = null;
    private container: HTMLDivElement | null = null;
    private ready = false;

    public start(): void {
        if (this.game) return;
        const scene = new DisplayRenderHostScene(() => {
            useDisplayImageExportStore
                .getState()
                .setService(new DisplayImageExportService(scene));
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
        useDisplayImageExportStore.getState().clear();
        useUiAvatarStore.getState().clear();
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
