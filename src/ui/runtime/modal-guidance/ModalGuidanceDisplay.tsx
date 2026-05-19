import { Card } from "../../lib/atoms/card";
import { RichText } from "../../lib/atoms/rich-text/RichText";
import {
    ContinueButton,
    Title,
    TutorialCard,
    TutorialImage,
} from "../notifications/RuntimeNotificationTutorial.styles";
import { resolveTutorialGifSrc } from "../tutorials/resolveTutorialGifSrc";

interface ModalGuidanceDisplayProps {
    title: string;
    text: string;
    imageUrl: string | null;
    onContinue: () => void;
}

export const ModalGuidanceDisplay = ({
    title,
    text,
    imageUrl,
    onContinue,
}: ModalGuidanceDisplayProps) => (
    <Card padding="xl">
        <TutorialCard>
            {imageUrl ? (
                <TutorialImage
                    src={resolveTutorialGifSrc(imageUrl)}
                    alt={title}
                />
            ) : null}
            {title ? <Title variant="header" text={title} /> : null}
            <RichText variant="callout" text={text} />
            <ContinueButton onClick={onContinue}>CONTINUE</ContinueButton>
        </TutorialCard>
    </Card>
);
