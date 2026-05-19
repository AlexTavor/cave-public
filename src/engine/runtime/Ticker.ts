export class Ticker {
    private running = false;
    private callback: ((dt: number) => void) | null = null;
    private frameId: number | null = null;
    private lastTimestamp: number | null = null;

    public setCallback(fn: ((dt: number) => void) | null): void {
        this.callback = fn;
    }

    public start(): void {
        if (this.running) return;
        this.running = true;
        this.loop();
    }

    public stop(): void {
        if (!this.running) return;
        this.running = false;
        if (this.frameId !== null) {
            globalThis.cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
        this.lastTimestamp = null;
    }

    public step(): void {
        this.callback?.(0);
    }

    private loop(): void {
        if (!this.running) return;
        this.frameId = globalThis.requestAnimationFrame((timestamp) => {
            const dt =
                this.lastTimestamp === null
                    ? 0
                    : timestamp - this.lastTimestamp;
            this.lastTimestamp = timestamp;
            this.callback?.(dt);
            this.loop();
        });
    }
}
