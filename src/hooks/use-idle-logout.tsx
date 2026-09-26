
"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from './use-toast';
import { auth, signOut } from '@/lib/auth';

const useIdleLogout = (timeout = 600000) => { // 10 minutes default
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const idleTimer = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('authenticatedUser');
      router.push('/admin');
      toast({
        title: 'تم تسجيل الخروج',
        description: 'تم تسجيل خروجك بسبب عدم النشاط.',
      });
    } catch (error) {
      console.error("Error signing out due to inactivity:", error);
    }
  }, [router, toast]);


  const resetTimer = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
    }
    
    // The installed app (home-screen icon) relies on the phone's own lock screen,
    // so it stays signed in; the idle logout only applies in a normal browser tab.
    const isInstalledApp =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isInstalledApp) return;

    const isAdminPage = pathname === '/admin';
    const isAuthenticated = !!localStorage.getItem('authenticatedUser');

    if (isAuthenticated && !isAdminPage) {
        idleTimer.current = setTimeout(logout, timeout);
    }
  }, [pathname, timeout, logout]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'];
    const handleActivity = () => resetTimer();

    events.forEach(event => window.addEventListener(event, handleActivity));
    
    resetTimer();

    return () => {
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [resetTimer]);

  return null;
};

export default useIdleLogout;
