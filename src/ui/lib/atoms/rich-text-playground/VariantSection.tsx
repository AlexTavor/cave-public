import React from "react";
import { RichText } from "../rich-text/RichText";
import { Card } from "../card";
import { variantSamples } from "./playgroundData";
import {
  sectionHeadingStyle,
  sampleGroupWithMarginStyle,
  sampleTitleStyle,
} from "./playground.styles";

export const VariantSection: React.FC = () => (
  <>
    <h3 style={sectionHeadingStyle}>Style Variants</h3>
    <div style={sampleGroupWithMarginStyle}>
      {variantSamples.map((sample, i) => (
        <div key={sample.title + i}>
          <h4 style={sampleTitleStyle}>{sample.title}</h4>
          <Card padding="sm" variant="surface">
            <RichText text={sample.text} variant={sample.variant} />
          </Card>
        </div>
      ))}
    </div>
  </>
);
