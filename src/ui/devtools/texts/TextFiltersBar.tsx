import {
    FilterBar,
    FilterGroup,
    FilterInput,
    FilterSelect,
} from "./TextsEditor.styles";
import type { TextFieldCategory, TextOwnerType } from "./types";

interface TextFiltersBarProps {
    category: "all" | TextFieldCategory;
    type: "all" | TextOwnerType;
    query: string;
    categoryOptions: readonly ("all" | TextFieldCategory)[];
    typeOptions: readonly ("all" | TextOwnerType)[];
    onCategoryChange: (value: "all" | TextFieldCategory) => void;
    onTypeChange: (value: "all" | TextOwnerType) => void;
    onQueryChange: (value: string) => void;
}

export const TextFiltersBar = ({
    category,
    type,
    query,
    categoryOptions,
    typeOptions,
    onCategoryChange,
    onTypeChange,
    onQueryChange,
}: TextFiltersBarProps) => (
    <FilterBar>
        <FilterGroup>
            Category
            <FilterSelect
                value={category}
                onChange={(event) =>
                    onCategoryChange(event.target.value as typeof category)
                }
            >
                {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </FilterSelect>
        </FilterGroup>
        <FilterGroup>
            Type
            <FilterSelect
                value={type}
                onChange={(event) =>
                    onTypeChange(event.target.value as typeof type)
                }
            >
                {typeOptions.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </FilterSelect>
        </FilterGroup>
        <FilterGroup>
            Search
            <FilterInput
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
            />
        </FilterGroup>
    </FilterBar>
);
