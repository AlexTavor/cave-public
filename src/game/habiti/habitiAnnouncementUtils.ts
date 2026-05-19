import {
    DEFAULT_HABITI_ANNOUNCEMENT_COMPONENT,
    type HabitiAnnouncementComponent,
    type HabitiAnnouncementItem,
} from "../../data/schemas/components/habitiAnnouncement";
import type { RuntimeEntity } from "../../engine/runtime/types";

type WorldWithAnnouncement = RuntimeEntity & {
    draft?: { active?: boolean };
    thought?: { active?: boolean };
    tutorial?: { attention?: { pauseGame?: boolean } };
    habitiAnnouncement?: HabitiAnnouncementComponent;
};

const sortIds = (ids: string[]) =>
    [...new Set(ids)].sort((a, b) => a.localeCompare(b));
const normalizeItem = (
    item: HabitiAnnouncementItem,
): HabitiAnnouncementItem => ({
    ...item,
    habitusIds: sortIds(item.habitusIds),
});

const readAnnouncement = (
    world: WorldWithAnnouncement,
): HabitiAnnouncementComponent =>
    world.habitiAnnouncement ?? { ...DEFAULT_HABITI_ANNOUNCEMENT_COMPONENT };

const hasBlockingOverlay = (world: WorldWithAnnouncement) =>
    Boolean(
        world.draft?.active ||
        world.thought?.active ||
        world.tutorial?.attention?.pauseGame,
    );

export const enqueueHabitiAnnouncement = (
    world: RuntimeEntity,
    item: HabitiAnnouncementItem,
) => {
    const typedWorld = world as WorldWithAnnouncement;
    const announcement = readAnnouncement(typedWorld);
    const nextItem = normalizeItem(item);
    if (nextItem.habitusIds.length === 0) return;
    typedWorld.habitiAnnouncement =
        announcement.active || hasBlockingOverlay(typedWorld)
            ? { ...announcement, queue: [...announcement.queue, nextItem] }
            : { ...announcement, active: true, current: nextItem };
};

export const acknowledgeHabitiAnnouncement = (world: RuntimeEntity) => {
    const typedWorld = world as WorldWithAnnouncement;
    const announcement = readAnnouncement(typedWorld);
    if (!announcement.active || !announcement.current) return;
    const [next, ...rest] = announcement.queue;
    typedWorld.habitiAnnouncement = {
        ...announcement,
        active: !!next && !hasBlockingOverlay(typedWorld),
        current: next && !hasBlockingOverlay(typedWorld) ? next : null,
        queue: next && hasBlockingOverlay(typedWorld) ? [next, ...rest] : rest,
    };
};
