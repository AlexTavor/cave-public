import { Button } from "../../lib/atoms/button";
import { Card } from "../../lib/atoms/card";
import { Modal } from "../../lib/atoms/modal/Modal";
import {
    ButtonRow,
    DialogBody,
    DialogText,
    DialogTitle,
} from "./NewGameDialog.styles";

export interface NewGameDialogProps {
    isOpen: boolean;
    onBack: () => void;
    onPlay: () => void;
}

export const NewGameDialog = ({
    isOpen,
    onBack,
    onPlay,
}: NewGameDialogProps) => (
    <Modal isOpen={isOpen} onClose={onBack}>
        <Card padding="lg">
            <DialogBody>
                <DialogTitle>Start A New Game?</DialogTitle>
                <DialogText>
                    Cave autosaves continuously while you play. Starting a new
                    game will overwrite the autosave slot the next time autosave
                    runs.
                </DialogText>
                <DialogText>
                    If you want to keep the current run, back out now and save
                    it to a named slot first.
                </DialogText>
                <ButtonRow>
                    <Button onClick={onBack} type="button" variant="ghost">
                        Back
                    </Button>
                    <Button onClick={onPlay} type="button">
                        Play
                    </Button>
                </ButtonRow>
            </DialogBody>
        </Card>
    </Modal>
);
