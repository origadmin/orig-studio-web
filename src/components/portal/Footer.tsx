import React from 'react';
import {Link} from '@tanstack/react-router';
import {Globe, Heart, Mail, Video, MessageCircle} from 'lucide-react';

const Footer = () => {
    return (
        <footer className="border-t border-border py-8">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div className="space-y-3">
                        <Link to="/" className="flex items-center space-x-2">
                            <img src="/logo.svg" alt="OrigStudio" className="h-7 w-7" />
                            <span className="text-base font-bold text-foreground tracking-tight">OrigStudio</span>
                        </Link>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Next-generation video platform powered by Go microservices.
                        </p>
                        <div className="flex items-center space-x-3">
                            <SocialIcon icon={<Globe size={16}/>}/>
                            <SocialIcon icon={<Mail size={16}/>}/>
                            <SocialIcon icon={<Video size={16}/>}/>
                            <SocialIcon icon={<MessageCircle size={16}/>}/>
                        </div>
                    </div>

                    <FooterSection title="Platform" links={[
                        {label: 'Explore', to: '/'},
                        {label: 'Trending', to: '/trending'},
                        {label: 'Browse', to: '/browse'},
                        {label: 'Channels', to: '/c/1'},
                    ]}/>

                    <FooterSection title="Create" links={[
                        {label: 'Upload Video', to: '/me/videos'},
                        {label: 'Start Streaming', to: '/live'},
                    ]}/>

                    <FooterSection title="Account" links={[
                        {label: 'My Profile', to: '/u/1'},
                        {label: 'My Favorites', to: '/me/favorites'},
                        {label: 'Notifications', to: '/notifications'},
                        {label: 'Sign In', to: '/auth/signin'},
                    ]}/>
                </div>

                <div
                    className="pt-4 border-t border-border flex flex-col md:flex-row justify-between items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                    <div className="flex items-center gap-4">
                        <Link to="/privacy" className="hover:text-info transition-colors">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-info transition-colors">Terms of Service</Link>
                        <Link to="/cookies" className="hover:text-info transition-colors">Cookie Policy</Link>
                    </div>
                    <p className="flex items-center gap-1.5">
                        Made with <Heart size={10} className="text-destructive fill-destructive"/> by
                        <span className="text-foreground">OrigAdmin Team</span> © 2024
                    </p>
                </div>
            </div>
        </footer>
    );
};

const FooterSection = ({title, links}: {
    title: string;
    links: { label: string; to: string; search?: Record<string, any> }[]
}) => (
    <div className="space-y-2">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-widest">{title}</h4>
        <ul className="space-y-1.5">
            {links.map((link) => (
                <li key={link.label}>
                    <Link to={link.to} search={link.search}
                          className="text-xs text-muted-foreground font-medium hover:text-info transition-all hover:translate-x-0.5 inline-block">
                        {link.label}
                    </Link>
                </li>
            ))}
        </ul>
    </div>
);

const SocialIcon = ({icon}: any) => (
    <button
        className="w-8 h-8 bg-card border border-border rounded-lg flex items-center justify-center text-muted-foreground hover:text-info hover:border-primary/30 hover:bg-primary/5 transition-all shadow-sm">
        {icon}
    </button>
);

export default Footer;
