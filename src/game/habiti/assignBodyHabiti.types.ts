import type {
  BodySettings,
  HabitusDefinition,
} from "../../data/schemas/game/habiti";

export type AssignBodyHabitiInput = {
  identitySerial: number;
  existingHabiti?: string[];
  settings?: BodySettings;
  habitusIndex: Record<string, HabitusDefinition>;
  worldSeed?: string;
  forcedHabiti?: string[];
  onInvalidForcedHabitusId?: (id: string, reason: string) => void;
};
