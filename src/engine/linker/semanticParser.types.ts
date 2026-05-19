import type { z } from "zod";
import type { SysConfigSchema } from "../../data/schemas/v2/config";
import type { DraftOptionBlueprintSchema, DraftPoolBlueprintSchema } from "../../data/schemas/draft";
import type { BlueprintV2Entry } from "./blueprintV2Schema";
import type { SemanticArtData } from "./semanticArtSchema";

export type SemanticFragment =
    | { kind: "cave"; data: Partial<z.infer<typeof SysConfigSchema>> }
    | {
          kind: "draft";
          data: {
              draftOptions?: Record<
                  string,
                  z.infer<typeof DraftOptionBlueprintSchema>
              >;
              draftPools?: Record<
                  string,
                  z.infer<typeof DraftPoolBlueprintSchema>
              >;
          };
      }
    | {
          kind: "art";
          data: SemanticArtData;
      }
    | { kind: "bp"; data: Record<string, BlueprintV2Entry> };
