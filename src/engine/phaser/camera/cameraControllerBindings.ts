import type { CameraInputBindings } from "./cameraControllerBootstrap";
import {
    beginDrag,
    clampAndApply,
    endDrag,
    handleWheel,
    publishCameraState,
    updateDrag,
} from "./cameraInputHandlers";
import {
    beginPinch,
    canStartPinch,
    isPrimaryCameraPointer,
    updatePinch,
} from "./cameraTouch";
import type { BindingContext } from "./cameraControllerBindings.types";

export const createCameraInputBindings = ({
    scene,
    callbacks,
    getConfig,
    getState,
    getWorld,
    isPointerOverObject,
    setState,
}: BindingContext): CameraInputBindings => ({
    down: (pointer) => {
        if (!isPrimaryCameraPointer(pointer)) return;
        if (canStartPinch(scene.input, isPointerOverObject)) {
            setState({
                drag: null,
                pinch: beginPinch(
                    scene.cameras.main,
                    scene.input.pointer1,
                    scene.input.pointer2,
                ),
                vx: 0,
                vy: 0,
            });
            return;
        }
        setState({
            drag: beginDrag(
                pointer,
                scene.cameras.main,
                isPointerOverObject(pointer),
            ),
            vx: 0,
            vy: 0,
        });
    },
    move: (pointer) => {
        const state = getState();
        if (
            state.pinch &&
            scene.input.pointer1.isDown &&
            scene.input.pointer2.isDown
        ) {
            if (
                updatePinch(
                    state.pinch,
                    scene.cameras.main,
                    scene.input.pointer1,
                    scene.input.pointer2,
                    getConfig(),
                    getWorld(),
                )
            ) {
                publishCameraState(
                    scene.cameras.main,
                    callbacks.setCameraState,
                );
            }
            return;
        }
        if (!state.drag || !pointer.isDown || state.drag.startedOnObject)
            return;
        const prevX = scene.cameras.main.scrollX;
        const prevY = scene.cameras.main.scrollY;
        const velocity = { x: state.vx, y: state.vy };
        updateDrag(pointer, state.drag, scene.cameras.main, velocity);
        clampAndApply(scene.cameras.main, getWorld());
        setState({
            vx: scene.cameras.main.scrollX - prevX,
            vy: scene.cameras.main.scrollY - prevY,
        });
        publishCameraState(scene.cameras.main, callbacks.setCameraState);
    },
    up: (pointer) => {
        const state = getState();
        if (state.pinch) {
            setState({ pinch: null });
            publishCameraState(scene.cameras.main, callbacks.setCameraState);
        }
        if (!state.drag) return;
        endDrag(state.drag, pointer, getConfig(), callbacks.selectEntity);
        setState({ drag: null });
        publishCameraState(scene.cameras.main, callbacks.setCameraState);
    },
    wheel: (pointer, _objects, _dx, dy) =>
        handleWheel(
            scene.cameras.main,
            pointer.x,
            pointer.y,
            dy,
            getConfig(),
            getWorld(),
            () =>
                publishCameraState(
                    scene.cameras.main,
                    callbacks.setCameraState,
                ),
        ),
});
