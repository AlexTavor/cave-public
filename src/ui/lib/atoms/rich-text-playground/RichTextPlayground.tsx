import React, { useMemo } from "react";
import { ThemeProvider } from "../../foundation/theme/ThemeProvider";
import { IconRegistryProvider } from "../../foundation/icon-registry/IconRegistryProvider";
import { RichTextContext } from "../rich-text/RichTextContext";
import { Card } from "../card";
import { mockResolveRef } from "./playgroundResolver";
import { VariantSection } from "./VariantSection";
import { FeatureSection } from "./FeatureSection";
import { scrollContainerStyle } from "./playground.styles";

const PlaygroundContent: React.FC = () => (
  <div style={scrollContainerStyle}>
    <Card padding="lg">
      <h2 style={{ color: "white", marginTop: 0 }}>RichText Atom</h2>
      <VariantSection />
      <FeatureSection />
    </Card>
  </div>
);

export const RichTextPlayground: React.FC = () => {
  const value = useMemo(() => ({ resolveRef: mockResolveRef }), []);

  return (
    <ThemeProvider>
      <IconRegistryProvider>
        <RichTextContext.Provider value={value}>
          <PlaygroundContent />
        </RichTextContext.Provider>
      </IconRegistryProvider>
    </ThemeProvider>
  );
};
