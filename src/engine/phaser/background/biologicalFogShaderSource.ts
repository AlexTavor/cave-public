export const BIOLOGICAL_FOG_FRAGMENT_SHADER = `
precision mediump float;

uniform vec2 uResolution;
uniform vec2 uCameraScroll;
uniform float uCameraZoom;
uniform float uTimeMs;
uniform float uPulse01;
uniform vec3 uBaseColor;
uniform vec3 uLiftColor;
uniform float uIntensity;
uniform float uLargeScale;
uniform float uSmallScale;
uniform vec2 uLargeDrift;
uniform vec2 uSmallDrift;
uniform float uThresholdLow;
uniform float uThresholdHigh;
uniform float uHeartbeatAmplitude;

varying vec2 fragCoord;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 local = fract(p);
    vec2 smooth = local * local * (3.0 - 2.0 * local);
    float a = hash(cell);
    float b = hash(cell + vec2(1.0, 0.0));
    float c = hash(cell + vec2(0.0, 1.0));
    float d = hash(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, smooth.x), mix(c, d, smooth.x), smooth.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p);
        p = p * 2.02 + vec2(17.3, 9.1);
        amplitude *= 0.5;
    }
    return value;
}

void main() {
    vec2 worldPos = uCameraScroll + fragCoord;
    float large = fbm(worldPos * uLargeScale + uLargeDrift * uTimeMs);
    float small = fbm(worldPos * uSmallScale + uSmallDrift * uTimeMs);
    float combined = clamp(0.6 * large + 0.4 * small, 0.0, 1.0);
    float fog01 = smoothstep(uThresholdLow, uThresholdHigh, combined);
    float heartbeat = 1.0 + uHeartbeatAmplitude * clamp(uPulse01, 0.0, 1.0);
    vec3 color = uBaseColor + uLiftColor * uIntensity * fog01 * heartbeat;
    gl_FragColor = vec4(color, 1.0);
}
`;

export const createBiologicalFogUniformDefinitions = () => ({
    uResolution: { type: "2f", value: { x: 1, y: 1 } },
    uCameraScroll: { type: "2f", value: { x: 0, y: 0 } },
    uCameraZoom: { type: "1f", value: 1 },
    uTimeMs: { type: "1f", value: 0 },
    uPulse01: { type: "1f", value: 0 },
    uBaseColor: { type: "3f", value: { x: 0, y: 0, z: 0 } },
    uLiftColor: { type: "3f", value: { x: 0, y: 0, z: 0 } },
    uIntensity: { type: "1f", value: 0 },
    uLargeScale: { type: "1f", value: 0 },
    uSmallScale: { type: "1f", value: 0 },
    uLargeDrift: { type: "2f", value: { x: 0, y: 0 } },
    uSmallDrift: { type: "2f", value: { x: 0, y: 0 } },
    uThresholdLow: { type: "1f", value: 0 },
    uThresholdHigh: { type: "1f", value: 1 },
    uHeartbeatAmplitude: { type: "1f", value: 0 },
});
