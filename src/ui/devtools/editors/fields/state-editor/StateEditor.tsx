import React from "react";
import { Button } from "../../../../lib/atoms/button/Button";
import {
    AddInput,
    AddRow,
    EditorContainer,
    EmptyState,
    FilterInput,
    Header,
    Rows,
} from "./StateEditor.styles";
import { StateRow } from "./StateRow";
import { useStateEditor } from "./useStateEditor";

export const StateEditor: React.FC = () => {
    const { filter, setFilter, addKey, setAddKey, entries, addEntry } =
        useStateEditor();

    return (
        <EditorContainer>
            <Header>
                <FilterInput
                    value={filter}
                    placeholder="Filter state keys"
                    onChange={(event) => setFilter(event.target.value)}
                />
                <AddRow>
                    <AddInput
                        value={addKey}
                        placeholder="Add state key"
                        onChange={(event) => setAddKey(event.target.value)}
                    />
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={!addKey.trim()}
                        onClick={addEntry}
                    >
                        Add
                    </Button>
                </AddRow>
            </Header>
            <Rows>
                {entries.length === 0 ? (
                    <EmptyState>No state entries yet.</EmptyState>
                ) : (
                    entries.map((entry) => (
                        <StateRow
                            key={entry.key}
                            entryKey={entry.key}
                            value={entry.value}
                        />
                    ))
                )}
            </Rows>
        </EditorContainer>
    );
};
