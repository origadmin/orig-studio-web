/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 */

import * as React from "react";
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {cn} from "@/lib/utils";

/**
 * Card — thin wrapper around the shadcn Card that preserves the legacy
 * `title` + `footer` API used throughout the app. The shadcn Card is the
 * single source of truth; the wrapper just makes adoption drop-in.
 */
interface CardProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
    footer?: React.ReactNode;
}

export const OrigCard: React.FC<CardProps> = ({
    title,
    children,
    className,
    footer,
}) => {
    return (
        <Card className={cn("bg-white", className)}>
            {title && (
                <CardHeader className="border-b border-slate-100">
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
            )}
            <CardContent className="p-6">{children}</CardContent>
            {footer && (
                <CardFooter className="border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                    {footer}
                </CardFooter>
            )}
        </Card>
    );
};

export {OrigCard as Card};
