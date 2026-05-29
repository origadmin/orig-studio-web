import {useState} from "react";
import {useNavigate, useSearch, Link} from "@tanstack/react-router";
import {useTranslation} from 'react-i18next';
import {api, setAuth} from "@/lib/request";
import {useAuth} from "@/hooks/useAuth";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Checkbox} from "@/components/ui/checkbox";
import {ShieldCheck, Mail, Lock, ArrowRight, Loader2, Briefcase, Play, Video, Music, Newspaper} from "lucide-react";

interface AuthResponse {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
    user: {
        id: string;
        username: string;
        nickname?: string;
        role?: string;
    };
}

export default function SignInPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const {login} = useAuth();
    const {t} = useTranslation();

    const search = useSearch({strict: false}) as { redirect?: string };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await api.post<AuthResponse>("/auth/signin", {username, password});
            setAuth({
                access_token: res.access_token,
                refresh_token: res.refresh_token,
                expires_in: res.expires_in,
                token_type: res.token_type,
            });
            login(res.access_token, res.refresh_token || '', {
                id: res.user.id,
                username: res.user.username,
                displayName: res.user.nickname || res.user.username,
                roles: res.user.role === "admin" ? ["admin"] : ["user"],
            });

            const redirectUrl = search.redirect;
            if (redirectUrl && redirectUrl.startsWith('/')) {
                navigate({to: redirectUrl});
            } else {
                navigate({to: "/"});
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            <div
                className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 text-white overflow-hidden">
                <img
                    src="/assets/images/login-bg.jpg"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div
                    className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-primary/50"/>
                <div className="absolute inset-0 opacity-10"
                     style={{
                         backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                     }}/>
                <div
                    className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-white/10 blur-[60px] rounded-full"/>
                <div
                    className="absolute bottom-[-10%] left-[-5%] w-[35%] h-[35%] bg-white/10 blur-[60px] rounded-full"/>
                <div
                    className="absolute top-[40%] right-[20%] w-[20%] h-[20%] bg-white/5 blur-[40px] rounded-full"/>

                <div className="relative z-10 flex items-center gap-3">
                    <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-card">
                        <ShieldCheck className="w-7 h-7"/>
                    </div>
                    <span className="text-2xl font-bold tracking-tight">OrigCMS</span>
                </div>

                <div className="relative z-10 space-y-8">
                    <blockquote className="text-2xl font-light leading-relaxed opacity-90">
                        "A powerful content management platform that helps you manage media, articles, and live
                        streaming with ease."
                    </blockquote>
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2 text-white/70">
                            <Video className="w-5 h-5"/>
                            <span className="text-sm">Video</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/70">
                            <Music className="w-5 h-5"/>
                            <span className="text-sm">Music</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/70">
                            <Newspaper className="w-5 h-5"/>
                            <span className="text-sm">Articles</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/70">
                            <Play className="w-5 h-5"/>
                            <span className="text-sm">Live</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-white/40 text-sm">
                    &copy; 2026 OrigCMS. All rights reserved.
                </div>
            </div>

            <div
                className="flex-1 flex items-center justify-center p-6 md:p-12 bg-background text-foreground relative overflow-hidden">
                <div
                    className="absolute top-[-15%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[80px] rounded-full pointer-events-none"/>
                <div
                    className="absolute bottom-[-15%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[80px] rounded-full pointer-events-none"/>

                <main className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
                    <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
                        <div className="bg-primary/10 p-2.5 rounded-card">
                            <ShieldCheck className="w-6 h-6 text-primary"/>
                        </div>
                        <span className="text-xl font-bold text-foreground">OrigCMS</span>
                    </div>

                    <div
                        className="bg-card rounded-card shadow-sm border border-border/30 overflow-hidden transition-all duration-300 hover:shadow-md">
                        <div className="p-6 md:p-8 flex flex-col items-center text-center">
                            <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight text-foreground mb-1">
                                {t('auth.signIn.title')}
                            </h1>
                            <p className="text-sm text-muted-foreground mb-8">
                                {t('auth.signIn.desc')}
                            </p>

                            <form onSubmit={handleSubmit} className="w-full space-y-5 text-left">
                                {error && (
                                    <div
                                        className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="username"
                                           className="text-xs font-medium text-muted-foreground ml-1">
                                        {t('auth.signIn.usernameLabel')}
                                    </Label>
                                    <div className="relative group">
                                        <div
                                            className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                            <Mail className="w-4 h-4"/>
                                        </div>
                                        <Input
                                            id="username"
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder={t('auth.signIn.usernamePlaceholder')}
                                            required
                                            className="w-full pl-10 pr-3 py-2.5 bg-transparent border border-border rounded-input text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <Label htmlFor="password"
                                               className="text-xs font-medium text-muted-foreground">
                                            {t('auth.signIn.passwordLabel')}
                                        </Label>
                                        <Link to="/auth/forgot-password"
                                              className="text-xs font-medium text-primary hover:underline transition-all">
                                            Forgot?
                                        </Link>
                                    </div>
                                    <div className="relative group">
                                        <div
                                            className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                                            <Lock className="w-4 h-4"/>
                                        </div>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="w-full pl-10 pr-3 py-2.5 bg-transparent border border-border rounded-input text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 px-1">
                                    <Checkbox
                                        id="remember"
                                        checked={remember}
                                        onCheckedChange={(checked) => setRemember(checked === true)}
                                        className="w-4 h-4 rounded border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground cursor-pointer"
                                    />
                                    <Label htmlFor="remember"
                                           className="text-sm text-muted-foreground cursor-pointer select-none">
                                        Keep me signed in
                                    </Label>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2.5 px-6 bg-primary text-primary-foreground font-semibold text-base rounded-lg shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin"/>
                                            <span>Signing In...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>{t('auth.signIn.submit')}</span>
                                            <ArrowRight
                                                className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                                        </>
                                    )}
                                </Button>
                            </form>

                            <div className="w-full flex items-center gap-4 my-6">
                                <div className="flex-1 h-px bg-border/30"/>
                                <span className="text-xs font-medium text-muted-foreground tracking-wider">OR</span>
                                <div className="flex-1 h-px bg-border/30"/>
                            </div>

                            <div className="w-full grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    className="flex items-center justify-center gap-2 py-2 border border-border rounded-lg hover:bg-muted transition-colors duration-200 bg-background"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    <span className="text-xs font-medium text-foreground">Google</span>
                                </button>
                                <button
                                    type="button"
                                    className="flex items-center justify-center gap-2 py-2 border border-border rounded-lg hover:bg-muted transition-colors duration-200 bg-background"
                                >
                                    <Briefcase className="w-4 h-4 text-foreground"/>
                                    <span className="text-xs font-medium text-foreground">SSO</span>
                                </button>
                            </div>
                        </div>

                        <div
                            className="bg-muted/50 p-5 text-center border-t border-border/30">
                            <p className="text-sm text-muted-foreground">
                                Don't have an account?{" "}
                                <Link to="/auth/signup"
                                      className="text-primary font-semibold hover:underline transition-all ml-1">
                                    Sign Up
                                </Link>
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap justify-center gap-6 px-4">
                        <a className="text-xs text-muted-foreground hover:text-foreground transition-colors" href="#">Privacy Policy</a>
                        <a className="text-xs text-muted-foreground hover:text-foreground transition-colors" href="#">Terms of Service</a>
                        <a className="text-xs text-muted-foreground hover:text-foreground transition-colors" href="#">Help Center</a>
                    </div>
                </main>
            </div>
        </div>
    );
}
