import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Field} from '@/components/ui/field';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {userApi} from '@/lib/api/user';
import {cn} from '@/lib/utils';

interface ChangePasswordProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

const ChangePassword: React.FC<ChangePasswordProps> = ({onSuccess, onCancel}) => {
    const {t} = useTranslation();
    const [formData, setFormData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        old: false,
        new: false,
        confirm: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    const calculatePasswordStrength = (password: string): number => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
        return strength;
    };

    const getStrengthLabel = (strength: number): string => {
        switch (strength) {
            case 0:
                return t('password.strengthEmpty');
            case 1:
                return t('password.strengthWeak');
            case 2:
                return t('password.strengthFair');
            case 3:
                return t('password.strengthGood');
            case 4:
            case 5:
                return t('password.strengthStrong');
            default:
                return '';
        }
    };

    const getStrengthColor = (strength: number): string => {
        switch (strength) {
            case 0:
                return 'bg-muted';
            case 1:
                return 'bg-destructive';
            case 2:
                return 'bg-orange-500';
            case 3:
                return 'bg-warning';
            case 4:
            case 5:
                return 'bg-success';
            default:
                return 'bg-muted';
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({...prev, [field]: value}));
        setError(null);

        if (field === 'new_password') {
            setPasswordStrength(calculatePasswordStrength(value));
        }
    };

    const validateForm = (): boolean => {
        if (!formData.old_password) {
            setError(t('password.oldPasswordRequired'));
            return false;
        }
        if (!formData.new_password) {
            setError(t('password.newPasswordRequired'));
            return false;
        }
        if (formData.new_password.length < 8) {
            setError(t('password.passwordTooShort'));
            return false;
        }
        if (formData.new_password !== formData.confirm_password) {
            setError(t('password.passwordsNotMatch'));
            return false;
        }
        if (formData.old_password === formData.new_password) {
            setError(t('password.sameAsOld'));
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setLoading(true);
            setError(null);

            await userApi.changePassword({
                old_password: formData.old_password,
                new_password: formData.new_password,
            });

            setSuccess(true);
            setTimeout(() => {
                onSuccess?.();
            }, 2000);
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || t('password.changeFailed');
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = (field: 'old' | 'new' | 'confirm') => {
        setShowPasswords(prev => ({...prev, [field]: !prev[field]}));
    };

    if (success) {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center space-y-4 py-8">
                        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-success"/>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-semibold text-foreground">
                                {t('password.successTitle')}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {t('password.successMessage')}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5"/>
                    {t('password.title')}
                </CardTitle>
                <CardDescription>{t('password.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Field label={t('password.oldPassword')} required>
                        <div className="relative">
                            <Input
                                type={showPasswords.old ? 'text' : 'password'}
                                value={formData.old_password}
                                onChange={(e) => handleInputChange('old_password', e.target.value)}
                                placeholder={t('password.oldPasswordPlaceholder')}
                                className="pr-10"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('old')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showPasswords.old ? (
                                    <EyeOff className="w-4 h-4"/>
                                ) : (
                                    <Eye className="w-4 h-4"/>
                                )}
                            </button>
                        </div>
                    </Field>

                    <Field label={t('password.newPassword')} required>
                        <div className="relative">
                            <Input
                                type={showPasswords.new ? 'text' : 'password'}
                                value={formData.new_password}
                                onChange={(e) => handleInputChange('new_password', e.target.value)}
                                placeholder={t('password.newPasswordPlaceholder')}
                                className="pr-10"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('new')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showPasswords.new ? (
                                    <EyeOff className="w-4 h-4"/>
                                ) : (
                                    <Eye className="w-4 h-4"/>
                                )}
                            </button>
                        </div>
                        {formData.new_password && (
                            <div className="space-y-1 mt-2">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <div
                                            key={level}
                                            className={cn(
                                                'h-1 flex-1 rounded-full transition-colors',
                                                passwordStrength >= level
                                                    ? getStrengthColor(passwordStrength)
                                                    : 'bg-muted',
                                            )}
                                        />
                                    ))}
                                </div>
                                <p className={cn(
                                    'text-xs',
                                    passwordStrength <= 1
                                        ? 'text-destructive'
                                        : passwordStrength === 2
                                            ? 'text-orange-500'
                                            : passwordStrength === 3
                                                ? 'text-warning'
                                                : 'text-success',
                                )}>
                                    {getStrengthLabel(passwordStrength)}
                                </p>
                            </div>
                        )}
                    </Field>

                    <Field label={t('password.confirmPassword')} required>
                        <div className="relative">
                            <Input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                value={formData.confirm_password}
                                onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                                placeholder={t('password.confirmPasswordPlaceholder')}
                                className="pr-10"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('confirm')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showPasswords.confirm ? (
                                    <EyeOff className="w-4 h-4"/>
                                ) : (
                                    <Eye className="w-4 h-4"/>
                                )}
                            </button>
                        </div>
                    </Field>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4"/>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-medium text-foreground">
                            {t('password.requirements')}
                        </p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                            <li className={formData.new_password.length >= 8 ? 'text-success' : ''}>
                                • {t('password.reqMinLength')}
                            </li>
                            <li className={/[a-z]/.test(formData.new_password) && /[A-Z]/.test(formData.new_password) ? 'text-success' : ''}>
                                • {t('password.reqUpperLower')}
                            </li>
                            <li className={/\d/.test(formData.new_password) ? 'text-success' : ''}>
                                • {t('password.reqNumber')}
                            </li>
                            <li className={/[!@#$%^&*(),.?":{}|<>]/.test(formData.new_password) ? 'text-success' : ''}>
                                • {t('password.reqSpecialChar')}
                            </li>
                        </ul>
                    </div>

                    <div className="flex gap-3 pt-2">
                        {onCancel && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onCancel}
                                disabled={loading}
                                className="flex-1"
                            >
                                {t('common.cancel')}
                            </Button>
                        )}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                                    {t('password.changing')}
                                </>
                            ) : (
                                t('password.submit')
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default ChangePassword;
