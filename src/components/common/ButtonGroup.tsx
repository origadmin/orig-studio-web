/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 */

import * as React from "react";
import {ButtonGroup as ShadcnButtonGroup} from "@/components/ui/button-group";

/**
 * ButtonGroup — re-exports the shadcn primitive.
 * Preserves the legacy `orientation` prop ("horizontal" | "vertical").
 *
 * @deprecated Prefer the shadcn primitive directly via
 * `import {ButtonGroup} from "@/components/ui/button-group"`.
 */
interface ButtonGroupProps {
    children: React.ReactNode;
    className?: string;
    orientation?: "horizontal" | "vertical";
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
    children,
    className,
    orientation = "horizontal",
}) => {
    return (
        <ShadcnButtonGroup orientation={orientation} className={className}>
            {children}
        </ShadcnButtonGroup>
    );
};
