
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { verifyPin } from "./actions";

export default function AdminLoginPage() {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const logoUrl = "https://res.cloudinary.com/dw5sydtj6/image/upload/v1755563838/%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_imqtxp.png";
  
  const handleSuccessfulLogin = useCallback(() => {
    if (auth.currentUser) {
      localStorage.setItem("authenticatedUser", auth.currentUser.uid);
    }
    router.push("/dashboard");
  }, [router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous sign-in failed", error);
          toast({ variant: "destructive", title: "فشل الاتصال بالخادم" });
        }
      } else {
        if (localStorage.getItem("authenticatedUser") === user.uid) {
            router.push('/dashboard');
            return;
        }
      }
      setIsReady(true);
    });
    
    return () => unsubscribe();
  }, [router, toast]);


  const handleVerifyPin = async (pinValue: string) => {
    if (pinValue.length !== 4) {
      return;
    }
    setIsLoading(true);
    try {
      const { success, message } = await verifyPin(pinValue);

      if (success) {
        toast({ title: "تم التحقق بنجاح", description: "جاري تسجيل الدخول..." });
        handleSuccessfulLogin();
      } else {
        toast({ variant: "destructive", title: "رمز غير صحيح", description: message });
        setPin("");
      }
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
                <CardDescription>أدخل رمز الدخول السري (PIN) للوصول.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); handleVerifyPin(pin); }}>
                    <div className="flex justify-center" dir="ltr">
                        <InputOTP 
                            maxLength={4} 
                            value={pin}
                            onChange={(value) => setPin(value)}
                            disabled={isLoading}
                            onComplete={handleVerifyPin}
                        >
                            <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                            </InputOTPGroup>
                        </InputOTP>
                    </div>
                </form>
            </CardContent>
             <CardFooter>
                 <Button onClick={() => handleVerifyPin(pin)} className="w-full" disabled={isLoading || pin.length < 4}>
                      {isLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : null}
                      تسجيل الدخول
                  </Button>
             </CardFooter>
        </Card>
      </div>
    </div>
  );
}
