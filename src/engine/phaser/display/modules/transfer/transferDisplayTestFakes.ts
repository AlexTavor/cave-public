export interface FakeLight {
    x: number;
    y: number;
    radius: number;
    color: number;
    intensity: number;
    visible: boolean;
    setPosition(x: number, y: number): this;
    setRadius(value: number): this;
    setColor(value: number): this;
    setIntensity(value: number): this;
    setVisible(value: boolean): this;
}

const makeFakeLight = (
    x: number,
    y: number,
    radius: number,
    color: number,
    intensity: number,
): FakeLight => ({
    x,
    y,
    radius,
    color,
    intensity,
    visible: true,
    setPosition(nextX, nextY) {
        this.x = nextX;
        this.y = nextY;
        return this;
    },
    setRadius(value) {
        this.radius = value;
        return this;
    },
    setColor(value) {
        this.color = value;
        return this;
    },
    setIntensity(value) {
        this.intensity = value;
        return this;
    },
    setVisible(value) {
        this.visible = value;
        return this;
    },
});

export interface FakeEmitter {
    config: Record<string, unknown>;
    visible: boolean;
    started: boolean;
    destroyed: boolean;
    frequencyArgs: unknown[];
    stop(): void;
    start(): void;
    destroy(): void;
    setVisible(value: boolean): this;
    setFrequency(...args: unknown[]): this;
}

export const makeFakeEmitter = (): FakeEmitter => ({
    config: {},
    visible: true,
    started: false,
    destroyed: false,
    frequencyArgs: [],
    stop() {
        this.started = false;
    },
    start() {
        this.started = true;
    },
    destroy() {
        this.destroyed = true;
    },
    setVisible(value) {
        this.visible = value;
        return this;
    },
    setFrequency(...args) {
        this.frequencyArgs = args;
        return this;
    },
});

export const makeHolder = <T>() => ({
    children: [] as T[],
    add(child: T) {
        this.children.push(child);
    },
    remove(child: T) {
        this.children = this.children.filter((item) => item !== child);
    },
});

export const addFakeLight = (
    addedLights: FakeLight[],
    x: number,
    y: number,
    radius: number,
    color: number,
    intensity: number,
): FakeLight => {
    const light = makeFakeLight(x, y, radius, color, intensity);
    addedLights.push(light);
    return light;
};
