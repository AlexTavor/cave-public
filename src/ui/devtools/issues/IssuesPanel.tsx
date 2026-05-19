import React from "react";
import { Button } from "../../lib/atoms/button";
import {
    Container,
    Empty,
    IssueCard,
    IssueCardBody,
    IssueHeader,
    IssueHeaderDetails,
    MissingLabel,
    Mono,
    Row,
    Title,
} from "./IssuesPanel.styles";
import { useIssuesPanel } from "./useIssuesPanel";

export interface IssuesPanelProps {
    className?: string;
}

export const IssuesPanel: React.FC<IssuesPanelProps> = ({ className }) => {
    const { activeModuleFilename, broken, onOpenBlueprint, onRefresh } =
        useIssuesPanel();

    if (!activeModuleFilename) {
        return (
            <Container className={className}>
                <Title>Issues</Title>
                <Empty>No module open.</Empty>
            </Container>
        );
    }

    return (
        <Container className={className}>
            <Row>
                <Title>Issues</Title>
                <Button size="sm" variant="ghost" onClick={onRefresh}>
                    Refresh
                </Button>
            </Row>

            {broken.length === 0 ? (
                <Empty>No broken references detected.</Empty>
            ) : (
                broken.map((b, idx) => (
                    <IssueCard
                        key={`${b.fromId}:${b.missingId}:${idx}`}
                        padding="sm"
                        variant="surface"
                        interactive
                        onClick={() => onOpenBlueprint(b.fromId)}
                    >
                        <IssueCardBody>
                            <IssueHeader>
                                <IssueHeaderDetails>
                                    <MissingLabel title={b.missingId}>
                                        Missing: {b.missingId}
                                    </MissingLabel>
                                    <Mono title={b.path}>{b.path}</Mono>
                                </IssueHeaderDetails>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onOpenBlueprint(b.fromId);
                                    }}
                                >
                                    Open
                                </Button>
                            </IssueHeader>

                            <Mono>
                                From: {b.fromLabel} ({b.fromId})
                            </Mono>
                        </IssueCardBody>
                    </IssueCard>
                ))
            )}
        </Container>
    );
};
