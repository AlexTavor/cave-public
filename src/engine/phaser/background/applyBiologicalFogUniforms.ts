import Phaser from "phaser";
import type { BiologicalFogUniforms } from "./resolveBiologicalFogUniforms";

const setVec2 = (
    shader: Phaser.GameObjects.Shader,
    key: string,
    value: { x: number; y: number },
) => {
    shader.setUniform(`${key}.value.x`, value.x);
    shader.setUniform(`${key}.value.y`, value.y);
};

const setVec3 = (
    shader: Phaser.GameObjects.Shader,
    key: string,
    value: [number, number, number],
) => {
    shader.setUniform(`${key}.value.x`, value[0]);
    shader.setUniform(`${key}.value.y`, value[1]);
    shader.setUniform(`${key}.value.z`, value[2]);
};

export const applyBiologicalFogUniforms = (
    shader: Phaser.GameObjects.Shader,
    uniforms: BiologicalFogUniforms,
) => {
    setVec2(shader, "uResolution", uniforms.resolution);
    setVec2(shader, "uCameraScroll", uniforms.cameraScroll);
    setVec3(shader, "uBaseColor", uniforms.baseColor);
    setVec3(shader, "uLiftColor", uniforms.liftColor);
    setVec2(shader, "uLargeDrift", uniforms.largeDrift);
    setVec2(shader, "uSmallDrift", uniforms.smallDrift);
    shader.setUniform("uCameraZoom.value", uniforms.cameraZoom);
    shader.setUniform("uTimeMs.value", uniforms.timeMs);
    shader.setUniform("uPulse01.value", uniforms.pulse01);
    shader.setUniform("uIntensity.value", uniforms.intensity);
    shader.setUniform("uLargeScale.value", uniforms.largeScale);
    shader.setUniform("uSmallScale.value", uniforms.smallScale);
    shader.setUniform("uThresholdLow.value", uniforms.thresholdLow);
    shader.setUniform("uThresholdHigh.value", uniforms.thresholdHigh);
    shader.setUniform("uHeartbeatAmplitude.value", uniforms.heartbeatAmplitude);
};
