import {createFileRoute} from '@tanstack/react-router';

function MeOverview() {
    return (
        <div className="p-8 bg-muted/30 rounded-lg border border-dashed">
            <h2 className="text-xl font-bold mb-2">测试页面 - 概览</h2>
            <p className="text-muted-foreground">如果看到这个，说明index路由工作了！</p>
        </div>
    );
}

export const Route = createFileRoute('/_authenticated/_portal/me/')({
    component: MeOverview,
});
