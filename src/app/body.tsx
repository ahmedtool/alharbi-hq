
'use client'

import React, { ReactNode, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useIdleLogout from '@/hooks/use-idle-logout';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import useClient from '@/hooks/use-client';


const publicPages = ['/admin', '/support/submit', '/bio'];

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

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Check if user's UID matches the one stored in localStorage after PIN verification
                const isAuthenticated = localStorage.getItem('authenticatedUser') === user.uid;

                if (isAuthenticated) {
                    setIsVerified(true);
                } else {
                    localStorage.removeItem('authenticatedUser');
                    router.replace('/admin');
                }
            } else {
                localStorage.removeItem('authenticatedUser');
                router.replace('/admin');
            }
        });

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
    
    return <>{children}</>;
}


export default function Body({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
        {children}
    </AuthGuard>
  );
}
