export const createFakeContainer = () => ({
    x: 0,
    y: 0,
    alpha: 1,
    visible: true,
    interactiveEnabled: true,
    setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;
    },
    setVisible(v: boolean) {
        this.visible = v;
    },
    setAlpha(a: number) {
        this.alpha = a;
    },
    setScale(_s: number) {},
    setName(_n: string) {},
    setDepth(_d: number) {},
    add(_child: any) {},
    remove(_child: any) {},
    setInteractive() {
        this.interactiveEnabled = true;
        return this;
    },
    disableInteractive() {
        this.interactiveEnabled = false;
        return this;
    },
    destroy() {},
    parentContainer: null as any,
});

export const createFakeImage = () => ({
    ...createFakeContainer(),
    setTexture(_t: string) {},
    setRotation(_r: number) {},
    setFlipX(_f: boolean) {},
    setInteractive() {
        return this;
    },
    removeInteractive() {},
    on(_e: string, _cb: any) {
        return this;
    },
    off(_e: string, _cb: any) {
        return this;
    },
});

export const createFakeScene = () =>
    ({
        add: {
            container: () => createFakeContainer(),
            image: () => createFakeImage(),
            particles: () => createFakeImage(),
        },
        textures: { exists: () => false },
    }) as any;
