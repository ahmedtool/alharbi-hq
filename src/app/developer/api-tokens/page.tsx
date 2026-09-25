
"use client";

import * as React from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, deleteDoc } from "firebase/firestore";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, PlusCircle, Trash2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface ApiToken {
    id: string;
    name: string;
    token: string;
}

const TokenForm = ({ 
    onSave, 
    onClose 
}: { 
    onSave: () => void, 
    onClose: () => void 
}) => {
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [token, setToken] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async () => {
    if (!name || !token) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "الرجاء تعبئة اسم الرمز والرمز نفسه.",
        });
        return;
    }
    setIsLoading(true);
    try {
        await addDoc(collection(db, "api_tokens"), { name, token });
        toast({ title: "تم إضافة الرمز بنجاح!" });
        onSave();
        onClose();
    } catch (error) {
        console.error("Error saving token: ", error);
        toast({
            variant: "destructive",
            title: "حدث خطأ",
            description: "لم نتمكن من حفظ الرمز. الرجاء المحاولة مرة أخرى.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
            <DialogTitle>إضافة رمز جديد</DialogTitle>
            <DialogDescription>
                أدخل تفاصيل الرمز الجديد. سيتم تخزينه بأمان.
            </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-right">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="token-name" className="text-right">اسم الخدمة</Label>
                <Input id="token-name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" placeholder="مثال: GitHub"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="token-value" className="text-right">الرمز (Token)</Label>
                <Input id="token-value" value={token} onChange={e => setToken(e.target.value)} className="col-span-3" dir="ltr" />
            </div>
        </div>
        <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
        </DialogFooter>
    </DialogContent>
  );
};


export default function ApiTokensPage() {
    const { toast } = useToast();
    const [tokens, setTokens] = React.useState<ApiToken[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);

    const fetchTokens = async () => {
        setIsLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "api_tokens"));
            const tokensData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApiToken));
            setTokens(tokensData);
        } catch (error) {
            console.error("Error fetching tokens: ", error);
            toast({ variant: "destructive", title: "حدث خطأ أثناء جلب الرموز." });
        } finally {
            setIsLoading(false);
        }
    };
    
    React.useEffect(() => {
        fetchTokens();
    }, []);

    const handleDelete = async (token: ApiToken) => {
        if (!window.confirm("هل أنت متأكد أنك تريد حذف هذا الرمز؟ لا يمكن التراجع عن هذا الإجراء.")) return;
        try {
            await deleteDoc(doc(db, "api_tokens", token.id));
            toast({ title: "تم حذف الرمز بنجاح" });
            fetchTokens();
        } catch (error) {
            console.error("Error deleting token: ", error);
            toast({ variant: "destructive", title: "حدث خطأ أثناء حذف الرمز." });
        }
    };

    const handleCopy = (token: string) => {
        navigator.clipboard.writeText(token);
        toast({ title: "تم نسخ الرمز إلى الحافظة." });
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 text-right">
            <PageHeader title="واجهات API والرموز" description="إدارة مفاتيح ورموز API الخاصة فيك بكل أمان.">
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="ml-2 h-4 w-4" />
                            إضافة رمز
                        </Button>
                    </DialogTrigger>
                    <TokenForm 
                        onSave={() => {
                            fetchTokens();
                            setIsDialogOpen(false);
                        }}
                        onClose={() => setIsDialogOpen(false)}
                    />
                </Dialog>
            </PageHeader>
            <div className="grid gap-4 max-w-4xl">
                 {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-1/3" />
                                <Skeleton className="h-4 w-2/3 mt-2" />
                            </CardHeader>
                            <CardContent>
                               <Skeleton className="h-10 w-full" />
                            </CardContent>
                        </Card>
                    ))
                ) : tokens.length > 0 ? (
                    tokens.map(token => (
                        <Card key={token.id}>
                            <CardHeader>
                                <CardTitle>{token.name}</CardTitle>
                                <CardDescription>رمز API للوصول إلى خدمات {token.name}.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    <KeyRound className="h-5 w-5 text-muted-foreground" />
                                    <Input readOnly type="password" value={token.token} dir="ltr" />
                                    <Button variant="outline" size="icon" onClick={() => handleCopy(token.token)}>
                                        <Copy className="h-4 w-4" />
                                        <span className="sr-only">نسخ</span>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(token)}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">حذف</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[40vh]">
                        <div className="flex flex-col items-center gap-1 text-center">
                            <h3 className="text-2xl font-bold tracking-tight">
                                لا توجد رموز محفوظة.
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                أضف أول رمز API لك للبدء.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
