import Phaser from "phaser";
import {
    registerPhaserGame,
    unregisterPhaserGame,
} from "../debug/phaserGameRegistry";

export const createDebugGame = (): string => registerPhaserGame();

export const destroyPhaserGame = (params: {
    gameRef: { current: Phaser.Game | null };
    debugGameIdRef: { current: string | null };
}): void => {
    if (params.debugGameIdRef.current) {
        unregisterPhaserGame(params.debugGameIdRef.current);
        params.debugGameIdRef.current = null;
    }
    if (!params.gameRef.current) return;
    params.gameRef.current.destroy(true);
    params.gameRef.current = null;
};
