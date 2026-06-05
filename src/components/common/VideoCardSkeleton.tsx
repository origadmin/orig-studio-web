/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * VideoCardSkeleton - Loading skeleton for video cards (composes Skeleton).
 */

import React from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';

interface VideoCardSkeletonProps {
    count?: number;
}

const VideoCardSkeleton: React.FC<VideoCardSkeletonProps> = ({count = 1}) => {
    return (
        <>
            {Array.from({length: count}).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-video w-full rounded-none"/>
                    <CardContent className="p-3 space-y-2">
                        <Skeleton className="h-4 w-full"/>
                        <Skeleton className="h-4 w-3/4"/>
                        <div className="flex items-center gap-2 pt-1">
                            <Skeleton className="h-5 w-5 rounded-full shrink-0"/>
                            <Skeleton className="h-3 w-24"/>
                        </div>
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-3 w-16"/>
                            <Skeleton className="h-3 w-20"/>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </>
    );
};

export default VideoCardSkeleton;
