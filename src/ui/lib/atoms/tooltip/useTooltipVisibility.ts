import { useEffect, useState } from "react";

export const useTooltipVisibility = (isOpen: boolean) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;

        if (isOpen) {
            setIsVisible(true);
        } else if (isVisible) {
            timeout = setTimeout(() => {
                setIsVisible(false);
            }, 100);
        }

        return () => clearTimeout(timeout);
    }, [isOpen, isVisible]);

    return isVisible;
};
