
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const logoUrl = "https://res.cloudinary.com/dw5sydtj6/image/upload/v1755563838/%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_imqtxp.png";

  const goToDashboard = useCallback((userId: string) => {
    localStorage.setItem("authenticatedUser", userId);
    router.push("/dashboard");
  }, [router]);

  // Already signed in? Skip the form.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goToDashboard(data.session.user.id);
      else setIsReady(true);
    });
  }, [goToDashboard]);

  const handleLogin = async () => {
    if (!email || !password) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) {
        toast({ variant: "destructive", title: "بيانات الدخول غير صحيحة", description: "تأكد من البريد وكلمة المرور." });
        setPassword("");
        return;
      }
      toast({ title: "تم تسجيل الدخول", description: "جاري التحويل للوحة التحكم..." });
      goToDashboard(data.user.id);
    } catch (error) {
      console.error("Login error: ", error);
      toast({ variant: "destructive", title: "خطأ في تسجيل الدخول" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
            <Image src={logoUrl} alt="Logo" width={60} height={60} />
        </div>
        <Card>
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">لوحة التحكم</CardTitle>
                <CardDescription>سجّل دخولك بالبريد وكلمة المرور.</CardDescription>
            </CardHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">البريد الإلكتروني</Label>
                        <Input id="email" type="email" dir="ltr" autoComplete="username" value={email}
                            onChange={(e) => setEmail(e.target.value)} disabled={isLoading} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">كلمة المرور</Label>
                        <Input id="password" type="password" dir="ltr" autoComplete="current-password" value={password}
                            onChange={(e) => setPassword(e.target.value)} disabled={isLoading} required />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={isLoading || !email || !password}>
                        {isLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : null}
                        تسجيل الدخول
                    </Button>
                </CardFooter>
            </form>
        </Card>
      </div>
    </div>
  );
}
