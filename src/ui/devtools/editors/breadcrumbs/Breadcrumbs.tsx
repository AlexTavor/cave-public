import React from "react";
import { BreadcrumbsContainer, Crumb, Separator } from "./Breadcrumbs.styles";

interface BreadcrumbsProps {
    path: string[];
    onNavigate: (index: number) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ path, onNavigate }) => {
    if (path.length === 0) return null;

    return (
        <BreadcrumbsContainer>
            {path.map((segment, index) => {
                const isLast = index === path.length - 1;
                return (
                    <React.Fragment key={index}>
                        <Crumb isLast={isLast} onClick={() => !isLast && onNavigate(index)}>
                            {segment}
                        </Crumb>
                        {!isLast && <Separator>&gt;</Separator>}
                    </React.Fragment>
                );
            })}
        </BreadcrumbsContainer>
    );
};
