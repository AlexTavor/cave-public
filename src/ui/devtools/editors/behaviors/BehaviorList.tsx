import React from "react";
import type { BehaviorItem } from "./types";
import { BehaviorCard } from "./BehaviorCard";
import { EmptyState, List } from "./BehaviorList.styles";

export interface BehaviorListProps {
    items: BehaviorItem[];
    onDelete: (item: BehaviorItem) => void;
    onUpdate: (item: BehaviorItem, sentence: string) => void;
}

export const BehaviorList: React.FC<BehaviorListProps> = ({
    items,
    onDelete,
    onUpdate,
}) => {
    if (items.length === 0) {
        return <EmptyState>No behaviors yet.</EmptyState>;
    }

    return (
        <List>
            {items.map((item) => (
                <BehaviorCard
                    key={item.id}
                    item={item}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                />
            ))}
        </List>
    );
};
