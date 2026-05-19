import { useEffect } from "react";
import { useShellStore } from "../ui/devtools/shell/shell";
import { useRuntimeStore } from "../ui/runtime/state/useRuntimeStore";
import { togglePhaserDebugEnabled } from "../engine/phaser/debug/phaserDebugToggle";
import { useAppShellStore } from "./useAppShellStore";

const isEditableTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest("input, textarea, [contenteditable='true']"));
};

const isDevtoolsHotkey = (code: string): boolean =>
    code === "Backquote" || code === "IntlBackslash";

const isDebugStatsHotkey = (event: KeyboardEvent): boolean =>
    event.metaKey &&
    event.shiftKey &&
    event.code === "Space" &&
    !isEditableTarget(event.target);

const handleEscape = (
    shell: ReturnType<typeof useAppShellStore.getState>,
): boolean => {
    if (shell.overlay === "save-menu" || shell.overlay === "load-menu")
        return true;
    if (shell.overlay === "main-menu") {
        if (shell.menuOrigin === "devtools") {
            useShellStore.getState().toggleEditor(true);
            shell.openDevtools();
            return true;
        }
        if (shell.menuOrigin === "game") {
            shell.returnToGame();
            useRuntimeStore.getState().play();
        }
        return true;
    }
    if (shell.surface === "devtools") {
        useShellStore.getState().toggleEditor(false);
        shell.openMainMenuFromDevtools();
        return true;
    }
    if (shell.surface === "game" && shell.overlay === "none") {
        useRuntimeStore.getState().pause();
        shell.openMainMenuFromGame();
        return true;
    }
    return false;
};

export const useShellHotkeys = (): void => {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented) return;
            if (isDebugStatsHotkey(event)) {
                event.preventDefault();
                togglePhaserDebugEnabled();
                return;
            }
            const shell = useAppShellStore.getState();
            if (isDevtoolsHotkey(event.code)) {
                event.preventDefault();
                if (shell.surface === "devtools" && shell.overlay === "none") {
                    useShellStore.getState().toggleEditor(false);
                    shell.openMainMenuFromDevtools();
                    return;
                }
                useShellStore.getState().toggleEditor(true);
                shell.setErrorText(null);
                shell.openDevtools();
                return;
            }
            if (event.key !== "Escape" || isEditableTarget(event.target))
                return;
            handleEscape(shell);
        };
        globalThis.addEventListener("keydown", onKeyDown);
        return () => globalThis.removeEventListener("keydown", onKeyDown);
    }, []);
};
