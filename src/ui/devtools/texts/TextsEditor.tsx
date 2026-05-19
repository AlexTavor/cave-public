import { TextFiltersBar } from "./TextFiltersBar";
import { TextOwnerBlock } from "./TextOwnerBlock";
import { TextsHUD } from "./TextsHUD";
import {
    OverlayRoot,
    ScrollSurface,
    StageChrome,
    StateCard,
} from "./TextsEditor.styles";
import { useTextsEditorController } from "./useTextsEditorController";

interface TextsEditorProps {
    manifestPath: string;
}

export const TextsEditor = ({ manifestPath }: TextsEditorProps) => {
    const controller = useTextsEditorController(manifestPath);

    return (
        <OverlayRoot>
            <StageChrome>
                <TextsHUD
                    onAbort={controller.handleAbort}
                    onSave={controller.handleSave}
                    disableSave={!controller.canSave}
                />
                <TextFiltersBar
                    {...controller.filters}
                    categoryOptions={controller.categoryOptions}
                    typeOptions={controller.typeOptions}
                    onCategoryChange={controller.setCategoryFilter}
                    onTypeChange={controller.setTypeFilter}
                    onQueryChange={controller.setQuery}
                />
                {controller.isLoading ? (
                    <StateCard>Loading texts…</StateCard>
                ) : null}
                {!controller.isLoading && controller.error ? (
                    <StateCard>{controller.error}</StateCard>
                ) : null}
                {!controller.isLoading && !controller.error ? (
                    <ScrollSurface>
                        {controller.blocks.map((block) => (
                            <TextOwnerBlock key={block.key} block={block} />
                        ))}
                    </ScrollSurface>
                ) : null}
            </StageChrome>
        </OverlayRoot>
    );
};
