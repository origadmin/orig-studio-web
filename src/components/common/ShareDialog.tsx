import React, {useState} from 'react';
import {Share2, Loader2, Link2, Check} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogBody,
} from '@/components/ui/dialog';
import {usePortalConfig} from '@/hooks/queries';

export interface ShareDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The absolute or relative share link. */
    url: string;
    /** Content/page title used in the share text. */
    shareTitle?: string;
    /** Show a spinner in the link field while the caller resolves the URL. */
    loading?: boolean;
    /** Dialog heading override (defaults to the watch share title). */
    heading?: string;
    /** Dialog description override. */
    description?: string;
}

interface PlatformMeta {
    key: string;
    label: string;
    bg: string;
    build: (url: string, title: string) => string;
    icon: React.ReactNode;
}

const enc = (s: string) => encodeURIComponent(s);

// Canonical link-based share platforms. Order defines render order.
// `wechat` is intentionally omitted: it requires a QR code (no link intent),
// so it is left as a reserved switch key rendered separately when supported.
const PLATFORMS: PlatformMeta[] = [
    {
        key: 'twitter',
        label: 'X',
        bg: 'bg-black',
        build: (u, t) => `https://twitter.com/intent/tweet?url=${enc(u)}&text=${enc(t)}`,
        icon: (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path
                    d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
        ),
    },
    {
        key: 'facebook',
        label: 'Facebook',
        bg: 'bg-blue-600',
        build: (u) => `https://www.facebook.com/sharer/sharer.php?u=${enc(u)}`,
        icon: (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path
                    d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
        ),
    },
    {
        key: 'whatsapp',
        label: 'WhatsApp',
        bg: 'bg-green-500',
        build: (u, t) => `https://wa.me/?text=${enc(t)}%20${enc(u)}`,
        icon: (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path
                    d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
        ),
    },
    {
        key: 'telegram',
        label: 'Telegram',
        bg: 'bg-sky-500',
        build: (u, t) => `https://t.me/share/url?url=${enc(u)}&text=${enc(t)}`,
        icon: (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path
                    d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
        ),
    },
    {
        key: 'linkedin',
        label: 'LinkedIn',
        bg: 'bg-blue-700',
        build: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(u)}`,
        icon: (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path
                    d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
            </svg>
        ),
    },
    {
        key: 'weibo',
        label: 'Weibo',
        bg: 'bg-red-500',
        build: (u, t) => `https://service.weibo.com/share/share.php?url=${enc(u)}&title=${enc(t)}`,
        icon: (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path
                    d="M19.611 18.629c-1.153.72-3.003.523-4.114-.198-1.058.916-2.483 1.461-4.043 1.461C7.41 19.892 4 16.856 4 13.084c0-3.771 3.41-6.808 7.607-6.808 4.197 0 7.607 3.037 7.607 6.808 0 1.588-.552 3.049-1.476 4.202.673.917.746 2.207.273 3.343zm-4.258-2.38c.176-.257.118-.608-.138-.784-.256-.176-.607-.118-.783.139-.176.256-.118.607.138.783.256.177.608.119.783-.138zm-1.423-1.243c.367-.529.247-1.255-.269-1.616-.516-.36-1.223-.242-1.59.287-.367.529-.246 1.254.27 1.616.516.361 1.223.242 1.589-.287z"/>
            </svg>
        ),
    },
];

export default function ShareDialog({
                                          open,
                                          onOpenChange,
                                          url,
                                          shareTitle = '',
                                          loading,
                                          heading,
                                          description,
                                      }: ShareDialogProps) {
    const {t} = useTranslation();
    const [copied, setCopied] = useState(false);
    const {data: config} = usePortalConfig();
    // All platforms default to enabled if the setting is absent.
    const enabled = config?.share;
    const active = PLATFORMS.filter((p) => enabled?.[p.key] !== false);

    const handleCopy = async () => {
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard unavailable */
        }
    };

    const handleNative = async () => {
        if (navigator.share && url) {
            try {
                await navigator.share({title: shareTitle, url});
            } catch {
                /* user cancelled */
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{heading ?? t('watch.shareVideo')}</DialogTitle>
                    <DialogDescription>{description ?? t('watch.shareDescription')}</DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div
                            className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            {loading && !url ? (
                                <Loader2 className="w-4 h-4 animate-spin text-gray-500"/>
                            ) : (
                                <Link2 className="w-4 h-4 text-gray-500"/>
                            )}
                            <input
                                type="text"
                                value={url}
                                readOnly
                                placeholder={loading && !url ? t('common.loading') : ''}
                                className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none"
                            />
                        </div>
                        <Button
                            size="sm"
                            onClick={handleCopy}
                            disabled={!url}
                            className={copied ? 'bg-green-600 hover:bg-green-700' : 'bg-emerald-600 hover:bg-emerald-700'}
                        >
                            {copied ? <Check className="w-4 h-4"/> : t('watch.copyLink')}
                        </Button>
                    </div>

                    {active.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                            {active.map((p) => (
                                <a
                                    key={p.key}
                                    href={p.build(url, shareTitle)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <div className={`w-10 h-10 ${p.bg} rounded-full flex items-center justify-center`}>
                                        {p.icon}
                                    </div>
                                    <span className="text-xs text-gray-600 dark:text-muted-foreground">{p.label}</span>
                                </a>
                            ))}
                            {'share' in navigator && (
                                <button
                                    onClick={handleNative}
                                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <div
                                        className="w-10 h-10 bg-muted dark:bg-gray-700 rounded-full flex items-center justify-center">
                                        <Share2 className="w-5 h-5 text-gray-700 dark:text-gray-300"/>
                                    </div>
                                    <span className="text-xs text-gray-600 dark:text-muted-foreground">More</span>
                                </button>
                            )}
                        </div>
                    )}
                </DialogBody>
            </DialogContent>
        </Dialog>
    );
}
