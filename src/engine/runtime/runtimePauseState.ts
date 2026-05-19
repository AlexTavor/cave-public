import type { Snapshot } from "./Snapshot";
import type { DraftComponent } from "./components/DraftComponent";
import type { TutorialComponent } from "./components/TutorialComponent";
import type { HabitiAnnouncementComponent } from "../../data/schemas/components/habitiAnnouncement";
import type { NotificationAbilityGuidanceComponent } from "../../data/schemas/components/notificationAbilityGuidance";

type BlockingWorld = {
    draft?: DraftComponent;
    thought?: { active?: boolean };
    tutorial?: TutorialComponent;
    habitiAnnouncement?: HabitiAnnouncementComponent;
    notificationAbilityGuidance?: NotificationAbilityGuidanceComponent;
};

const getWorld = (snapshot: Snapshot): BlockingWorld | undefined =>
    snapshot.getEntity("sys_world") as BlockingWorld | undefined;

export const isBlockingOverlayActive = (snapshot: Snapshot): boolean => {
    const world = getWorld(snapshot);
    return Boolean(
        world?.draft?.active ||
        world?.thought?.active ||
        world?.habitiAnnouncement?.active ||
        world?.notificationAbilityGuidance?.active ||
        world?.tutorial?.attention.pauseGame,
    );
};

export const isDraftActive = (snapshot: Snapshot): boolean => {
    return Boolean(getWorld(snapshot)?.draft?.active);
};

