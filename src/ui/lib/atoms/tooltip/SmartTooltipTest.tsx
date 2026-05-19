import React from "react";
import styled from "@emotion/styled";
import { SmartTooltip } from "./SmartTooltip";
import { Card } from "../card";
import { FloatingTree } from "@floating-ui/react";

const TestContainer = styled.div`
    padding: 100px;
    display: flex;
    flex-direction: column;
    gap: 40px;
    background: ${({ theme }) => theme.colors.background};
    min-height: 100vh;
    pointer-events: all;
`;

const TestSection = styled.div`
    display: flex;
    gap: 20px;
    align-items: center;
    flex-wrap: wrap;
`;

const TestButton = styled.button`
    padding: 12px 24px;
    background: ${({ theme }) => theme.colors.buttonDefault};
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid ${({ theme }) => theme.colors.surface};
    border-radius: ${({ theme }) => theme.radius.md};
    font-family: ${({ theme }) => theme.fonts.ui};

    &:hover {
        background: ${({ theme }) => theme.colors.surfaceHighlight};
    }
`;

const Title = styled.h2`
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.ui};
    margin: 0;
    padding-bottom: 16px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.surface};
`;

const SimpleTooltipContent = styled.div`
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 14px;
`;

const NestedContent = styled.div`
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 14px;

    span {
        color: ${({ theme }) => theme.colors.primary};
        text-decoration: underline;
    }
`;

/**
 * Test component demonstrating SmartTooltip features:
 * - Basic tooltips with different placements
 * - Nested tooltips (tooltips within tooltips)
 * - Tooltips with Card components
 * - Hover tunneling behavior
 */
export const SmartTooltipTest: React.FC = () => {
    return (
        <FloatingTree>
            <TestContainer>
                <div>
                    <Title>Basic Tooltips (Different Placements)</Title>
                    <TestSection>
                        <SmartTooltip
                            content={
                                <SimpleTooltipContent>
                                    This tooltip appears on the left (default)
                                </SimpleTooltipContent>
                            }
                            placement="left"
                        >
                            <TestButton>Hover (Left)</TestButton>
                        </SmartTooltip>

                        <SmartTooltip
                            content={
                                <SimpleTooltipContent>
                                    This tooltip appears on top
                                </SimpleTooltipContent>
                            }
                            placement="top"
                        >
                            <TestButton>Hover (Top)</TestButton>
                        </SmartTooltip>

                        <SmartTooltip
                            content={
                                <SimpleTooltipContent>
                                    This tooltip appears on the right
                                </SimpleTooltipContent>
                            }
                            placement="right"
                        >
                            <TestButton>Hover (Right)</TestButton>
                        </SmartTooltip>

                        <SmartTooltip
                            content={
                                <SimpleTooltipContent>
                                    This tooltip appears on the bottom
                                </SimpleTooltipContent>
                            }
                            placement="bottom"
                        >
                            <TestButton>Hover (Bottom)</TestButton>
                        </SmartTooltip>
                    </TestSection>
                </div>

                <div>
                    <Title>Nested Tooltips (Hover Tunneling)</Title>
                    <TestSection>
                        <SmartTooltip
                            content={
                                <NestedContent>
                                    <Card>
                                        This is the first tooltip. Try hovering
                                        over{" "}
                                        <SmartTooltip
                                            content={
                                                <Card>
                                                    You found the nested
                                                    tooltip!
                                                </Card>
                                            }
                                            placement="top"
                                        >
                                            <span>this highlighted text</span>
                                        </SmartTooltip>{" "}
                                        to see a nested tooltip.
                                    </Card>
                                </NestedContent>
                            }
                            placement="right"
                        >
                            <TestButton>Nested Tooltip Demo</TestButton>
                        </SmartTooltip>
                    </TestSection>
                </div>

                <div>
                    <Title>Tooltips with Card Components</Title>
                    <TestSection>
                        <SmartTooltip
                            content={
                                <Card padding="md">
                                    <div
                                        style={{
                                            color: "white",
                                            fontFamily: "inherit",
                                        }}
                                    >
                                        <strong>Enhanced Tooltip</strong>
                                        <p style={{ margin: "8px 0 0" }}>
                                            This tooltip uses the Card component
                                            for consistent styling with organic
                                            edges.
                                        </p>
                                    </div>
                                </Card>
                            }
                            placement="top"
                        >
                            <TestButton>Card Tooltip</TestButton>
                        </SmartTooltip>
                    </TestSection>
                </div>

                <div>
                    <Title>Smart Positioning (Edge Cases)</Title>
                    <TestSection
                        style={{
                            justifyContent: "space-between",
                            width: "100%",
                        }}
                    >
                        <SmartTooltip
                            content={
                                <SimpleTooltipContent>
                                    This tooltip should flip to stay on screen
                                    when near the left edge
                                </SimpleTooltipContent>
                            }
                            placement="left"
                        >
                            <TestButton>Left Edge</TestButton>
                        </SmartTooltip>

                        <SmartTooltip
                            content={
                                <SimpleTooltipContent>
                                    This tooltip should flip to stay on screen
                                    when near the right edge
                                </SimpleTooltipContent>
                            }
                            placement="right"
                        >
                            <TestButton>Right Edge</TestButton>
                        </SmartTooltip>
                    </TestSection>
                </div>
            </TestContainer>
        </FloatingTree>
    );
};
