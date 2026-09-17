import React, {useState} from 'react';
import {ListVideo, Plus} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {useQueryClient} from '@tanstack/react-query';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Spinner} from '@/components/ui/spinner';
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {playlistApi} from '@/lib/api/playlist';

interface CreatePlaylistDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Create-playlist dialog.
 *
 * Composed from the design-system Dialog parts (DialogHeader / DialogBody /
 * DialogFooter) on purpose — those carry the shared px-6 py-5 / px-6 py-4
 * padding. The previous hand-rolled `<div className="space-y-4 mt-4 px-6">`
 * body had no vertical padding, so the actions sat flush against the dialog's
 * bottom edge (BUG-363, a repeat of the BUG-321 class).
 *
 * The action lives here rather than inside the profile playlist TAB so the tab
 * renders content only; the caller hosts the entry (Manage menu).
 */
const CreatePlaylistDialog: React.FC<CreatePlaylistDialogProps> = ({open, onOpenChange}) => {
    const {t} = useTranslation();
    const queryClient = useQueryClient();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [creating, setCreating] = useState(false);

    const reset = () => {
        setTitle('');
        setDescription('');
        setIsPublic(true);
    };

    const submit = async () => {
        if (!title.trim() || creating) return;
        setCreating(true);
        try {
            await playlistApi.create({
                title: title.trim(),
                description: description.trim(),
                is_public: isPublic,
            });
            // prefix match: every ['playlists', <userId>] list refetches
            await queryClient.invalidateQueries({queryKey: ['playlists']});
            onOpenChange(false);
            reset();
        } catch {
            toast.error(t('common.error'));
        } finally {
            setCreating(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                onOpenChange(next);
                if (!next) reset();
            }}
        >
            <DialogContent className="sm:max-w-md" data-testid="create-playlist-dialog">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ListVideo className="w-5 h-5 text-primary"/>
                        {t('playlists.createPlaylist')}
                    </DialogTitle>
                    <DialogDescription>{t('playlists.createPlaylistDesc')}</DialogDescription>
                </DialogHeader>

                <DialogBody className="space-y-4">
                    <div>
                        <label htmlFor="create-playlist-title" className="text-sm font-medium mb-1 block">
                            {t('playlists.title')}
                        </label>
                        <Input
                            id="create-playlist-title"
                            data-testid="create-playlist-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('playlists.titlePlaceholder')}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') submit();
                            }}
                        />
                    </div>
                    <div>
                        <label htmlFor="create-playlist-desc" className="text-sm font-medium mb-1 block">
                            {t('playlists.description')}
                        </label>
                        <Input
                            id="create-playlist-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('playlists.descriptionPlaceholder')}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="create-playlist-public"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                            className="rounded border-gray-300"
                        />
                        <label htmlFor="create-playlist-public" className="text-sm">
                            {t('playlists.makePublic')}
                        </label>
                    </div>
                </DialogBody>

                <DialogFooter>
                    <Button
                        variant="outline"
                        data-testid="create-playlist-cancel"
                        onClick={() => onOpenChange(false)}
                        disabled={creating}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        data-testid="create-playlist-submit"
                        onClick={submit}
                        disabled={!title.trim() || creating}
                        className="bg-primary hover:bg-primary/90"
                    >
                        {creating ? <Spinner className="w-4 h-4 mr-1"/> : <Plus className="w-4 h-4 mr-1"/>}
                        {t('watch.create')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreatePlaylistDialog;
