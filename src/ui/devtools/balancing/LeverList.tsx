import React, { useState } from "react";
import type { LeverType } from "../../../engine/balancing/Scanner";
import { useLeverStore } from "./state/useLeverStore";
import { LeverRowItem } from "./LeverRowItem";
import { useLeverGroups } from "./hooks/useLeverGroups";
import {
    EmptyGroup,
    FilterInput,
    LeverGroup,
    LeverGroupTitle,
    LeverScroll,
    LeverStack,
    LeverSubGroup,
    LeverSubGroupTitle,
} from "./LeverList.styles";

const groupLabels: Record<LeverType, string> = {
    setting: "Settings",
    state: "Global State",
    behavior: "Entities",
};

export const LeverList: React.FC = () => {
    const [filter, setFilter] = useState("");
    const levers = useLeverStore((s) => s.levers);
    const grouped = useLeverGroups(levers, filter);

    return (
        <LeverStack>
            <FilterInput
                placeholder="Filter levers"
                value={filter}
                onChange={(event) => setFilter(event.currentTarget.value)}
            />
            <LeverScroll>
                {(Object.keys(groupLabels) as LeverType[]).map((type) => {
                    const subGroups = grouped[type];
                    const subKeys = Object.keys(subGroups).sort((a, b) =>
                        a.localeCompare(b),
                    );

                    return (
                        <LeverGroup key={type} open>
                            <LeverGroupTitle>
                                {groupLabels[type]}
                            </LeverGroupTitle>
                            {subKeys.length === 0 ? (
                                <EmptyGroup>No levers found.</EmptyGroup>
                            ) : (
                                subKeys.map((key) => (
                                    <LeverSubGroup key={key} open>
                                        <LeverSubGroupTitle>
                                            {key}
                                        </LeverSubGroupTitle>
                                        {subGroups[key].map((lever) => (
                                            <LeverRowItem
                                                key={lever.id}
                                                lever={lever}
                                            />
                                        ))}
                                    </LeverSubGroup>
                                ))
                            )}
                        </LeverGroup>
                    );
                })}
            </LeverScroll>
        </LeverStack>
    );
};
