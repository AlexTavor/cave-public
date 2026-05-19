export type RuntimeOngoingKey =
    | "purge_active"
    | "hungry_bodies"
    | "cold_bodies"
    | "suspicion";

export const runtimeOngoingGuidanceMap: Readonly<
    Record<RuntimeOngoingKey, string>
> = {
    purge_active: "ongoing_purge_active",
    hungry_bodies: "ongoing_survival_spiral",
    cold_bodies: "ongoing_survival_spiral",
    suspicion: "ongoing_suspicion",
};
