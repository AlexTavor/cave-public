import React from "react";
import { StringArrayField } from "../../../fields/string-array-field/StringArrayField";

export const HabitusConstraintsSection: React.FC<{
    filename: string;
    basePath: string;
}> = ({ filename, basePath }) => (
    <div>
        <StringArrayField
            label="Excludes"
            filename={filename}
            path={`${basePath}.excludes`}
            tooltip="List Habiti that cannot coexist with this Habitus on the same body."
        />
    </div>
);
