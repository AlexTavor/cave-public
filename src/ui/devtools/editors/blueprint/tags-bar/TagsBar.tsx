import React from "react";
import { useTagsBar } from "./useTagsBar";
import { Tag, TagInput, TagsBarRoot } from "./TagsBar.styles";

export const TagsBar: React.FC = () => {
    const { tags, draft, setDraft, addTag, removeTag } = useTagsBar();

    return (
        <TagsBarRoot>
            {tags.map((t) => (
                <Tag key={t} onClick={() => removeTag(t)} title="Remove tag">
                    {t} ×
                </Tag>
            ))}
            <TagInput
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                placeholder="+ tag"
            />
        </TagsBarRoot>
    );
};
