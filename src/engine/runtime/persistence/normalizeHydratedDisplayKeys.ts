import type { SaveGameData } from "./types";
import { normalizeLegacyDisplayKey } from "../../../lib/displays/normalizeLegacyDisplayKey";

const normalizeEntity = <T extends Record<string, any>>(entity: T): T => ({
    ...entity,
    display:
        typeof entity.display?.display_key === "string"
            ? {
                  ...entity.display,
                  display_key: normalizeLegacyDisplayKey(
                      entity.display.display_key,
                  ),
              }
            : entity.display,
    body:
        typeof entity.body?.passport?.portraitIcon === "string"
            ? {
                  ...entity.body,
                  passport: {
                      ...entity.body.passport,
                      portraitIcon: normalizeLegacyDisplayKey(
                          entity.body.passport.portraitIcon,
                      ),
                  },
              }
            : entity.body,
});

export const normalizeHydratedDisplayKeys = (
    data: SaveGameData,
): SaveGameData => ({
    ...data,
    state: {
        ...data.state,
        entities: data.state.entities.map((entity) =>
            normalizeEntity(entity as any),
        ),
    },
});
