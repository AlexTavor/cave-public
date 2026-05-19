export interface CinematicEvent {
    lines: string[];
}

const queue: CinematicEvent[] = [];

export const CinematicEventBridge = {
    push(event: CinematicEvent): void {
        queue.push({ lines: [...event.lines] });
    },
    drain(): CinematicEvent[] {
        if (queue.length === 0) return [];
        const batch = queue.slice();
        queue.length = 0;
        return batch;
    },
    size(): number {
        return queue.length;
    },
};
