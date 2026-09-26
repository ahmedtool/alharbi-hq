
'use client'

import React, { ReactNode, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useIdleLogout from '@/hooks/use-idle-logout';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import useClient from '@/hooks/use-client';
import { MobileTabBar } from '@/components/app/mobile-tab-bar';


const publicPages = ['/admin', '/support/submit', '/bio'];
// Signed-in pages that aren't part of the dashboard, so they get no bottom tab bar.
const noTabBar = ['/login', '/verify-login', '/403', '/503'];

// Helper function to check if a path is public.
function isPublicPage(pathname: string): boolean {
    if (pathname === '/') return true; // Landing page is public
    if (publicPages.includes(pathname)) {
        return true;
    }
    return false;
}


function AuthGuard({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isVerified, setIsVerified] = useState(false);
    const isClient = useClient();

    useIdleLogout(10 * 60 * 1000); // 10 minutes

    useEffect(() => {
        if (!isClient) {
            if (isPublicPage(pathname)) {
                setIsVerified(true);
            }
            return;
        }

        if (isPublicPage(pathname)) {
             setIsVerified(true);
             return;
        }

        let cancelled = false;
        const allowOrRedirect = (userId: string | undefined) => {
            if (cancelled) return;
            if (userId) {
                localStorage.setItem('authenticatedUser', userId);
                setIsVerified(true);
            } else {
                localStorage.removeItem('authenticatedUser');
                setIsVerified(false);
                router.replace('/admin');
            }
        };

        supabase.auth.getSession().then(({ data }) => allowOrRedirect(data.session?.user.id));
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') allowOrRedirect(undefined);
            else if (session) allowOrRedirect(session.user.id);
        });
        const unsubscribe = () => { cancelled = true; sub.subscription.unsubscribe(); };

        return () => unsubscribe();
    }, [pathname, router, isClient]);
    
    if (!isVerified) {
        if (isClient) {
            return (
                <div className="flex h-screen items-center justify-center bg-background text-foreground">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="mr-4">جاري التحقق من الصلاحيات...</p>
                </div>
            );
        }
         // Render nothing on the server for non-public pages to prevent mismatch
        return null; 
    }
    
    // Every page enters with the same soft motion as the home page (which has its own intro).
    if (pathname === '/') return <>{children}</>;
    const page = <div key={pathname} className="page-enter">{children}</div>;
    if (isPublicPage(pathname) || noTabBar.includes(pathname)) return page;
    return <>{page}<MobileTabBar /></>;
}


export default function Body({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
        {children}
    </AuthGuard>
  );
}
