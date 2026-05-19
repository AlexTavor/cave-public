import { IconKey } from "../../foundation/icon-registry/IconKey";
import type { RichTextVariant } from "../rich-text/types";

export interface VariantSample {
  title: string;
  text: string;
  variant: RichTextVariant;
}

export interface FeatureSample {
  title: string;
  text: string;
}

export const variantSamples: VariantSample[] = [
  {
    title: "Header Variant",
    text: "Chapter 1: The Awakening",
    variant: "header",
  },
  {
    title: "Body Variant (Default)",
    text: `You wake up in a cold, damp cave. The air smells of [color=#aaffaa]mold[/color] and [icon=${IconKey.ResourceWood}] ancient timber.`,
    variant: "body",
  },
  {
    title: "Narration Variant",
    text: "Somewhere in the distance, a wolf howls. You feel a shiver run down your spine.",
    variant: "narration",
  },
];

export const featureSamples: FeatureSample[] = [
  {
    title: "Basic Formatting",
    text: "This is [b]bold[/b], [i]italic[/i], and [u]underlined[/u].",
  },
  {
    title: "Colors",
    text: "Text can be [color=red]Red[/color], [color=#00ff00]Green[/color], or [color=gold]Gold[/color].",
  },
  {
    title: "Icons (Inline)",
    text: `Gain 5 [icon=${IconKey.ResourceWood}] Wood and 10 [icon=${IconKey.ResourceFood}] Food. Costs 20 [icon=${IconKey.BodyStamina}] Stamina.`,
  },
  {
    title: "References (Interactive)",
    text: "You see [ref=body:alice]Alice[/ref] standing by the [ref=item:ancient_shrine]Ancient Shrine[/ref].",
  },
  {
    title: "Complex Nested",
    text: `[b]Task Complete:[/b] [ref=body:bob]Bob[/ref] gathered 50 [icon=${IconKey.ResourceWood}]! [color=green]Great success.[/color]`,
  },
];
