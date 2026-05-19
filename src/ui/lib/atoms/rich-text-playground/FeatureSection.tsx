import React from "react";
import { RichText } from "../rich-text/RichText";
import { Card } from "../card";
import { featureSamples } from "./playgroundData";
import {
  sectionHeadingStyle,
  sampleGroupStyle,
  sampleTitleStyle,
  rawTextStyle,
} from "./playground.styles";

export const FeatureSection: React.FC = () => (
  <>
    <h3 style={sectionHeadingStyle}>Features</h3>
    <div style={sampleGroupStyle}>
      {featureSamples.map((sample, i) => (
        <div key={sample.title + i}>
          <h4 style={sampleTitleStyle}>{sample.title}</h4>
          <Card padding="sm" variant="surface">
            <RichText text={sample.text} />
          </Card>
          <div style={rawTextStyle}>{sample.text}</div>
        </div>
      ))}
    </div>
  </>
);
