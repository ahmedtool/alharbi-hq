
"use client";

import * as React from "react";
import { db } from "@/lib/db";
import { collection, addDoc, getDocs, doc, deleteDoc } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode, Link as LinkIcon, PlusCircle, Puzzle, Trash2, Edit } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Snippet {
    id: string;
    title: string;
    description: string;
    code: string;
}

interface Tool {
    id: string;
    name: string;
    description: string;
    url: string;
}

const SnippetForm = ({ onSave, onClose }: { onSave: () => void, onClose: () => void }) => {
    const { toast } = useToast();
    const [title, setTitle] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [code, setCode] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);

    const handleSubmit = async () => {
        if (!title || !code) {
            toast({ variant: "destructive", title: "خطأ", description: "الرجاء تعبئة العنوان والكود." });
            return;
        }
        setIsLoading(true);
        try {
            await addDoc(collection(db, "snippets"), { title, description, code });
            toast({ title: "تم إضافة الكود بنجاح!" });
            onSave();
            onClose();
        } catch (error) {
            toast({ variant: "destructive", title: "حدث خطأ", description: "لم نتمكن من حفظ الكود." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>إضافة كود جديد</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-right">
                <Input placeholder="عنوان الكود" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Textarea placeholder="وصف الكود" value={description} onChange={(e) => setDescription(e.target.value)} />
                <Textarea placeholder="الكود..." value={code} onChange={(e) => setCode(e.target.value)} rows={10} dir="ltr" className="font-code" />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onClose}>إلغاء</Button>
                <Button onClick={handleSubmit} disabled={isLoading}>{isLoading ? "جاري الحفظ..." : "حفظ"}</Button>
            </DialogFooter>
        </DialogContent>
    );
};

const ToolForm = ({ onSave, onClose }: { onSave: () => void, onClose: () => void }) => {
    const { toast } = useToast();
    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [url, setUrl] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);

    const handleSubmit = async () => {
        if (!name || !url) {
            toast({ variant: "destructive", title: "خطأ", description: "الرجاء تعبئة اسم الأداة والرابط." });
            return;
        }
        setIsLoading(true);
        try {
            await addDoc(collection(db, "tools"), { name, description, url });
            toast({ title: "تم إضافة الأداة بنجاح!" });
            onSave();
            onClose();
        } catch (error) {
            toast({ variant: "destructive", title: "حدث خطأ", description: "لم نتمكن من حفظ الأداة." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>إضافة أداة جديدة</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-right">
                <Input placeholder="اسم الأداة" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="وصف الأداة" value={description} onChange={(e) => setDescription(e.target.value)} />
                <Input placeholder="رابط الأداة (URL)" value={url} onChange={(e) => setUrl(e.target.value)} dir="ltr" />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onClose}>إلغاء</Button>
                <Button onClick={handleSubmit} disabled={isLoading}>{isLoading ? "جاري الحفظ..." : "حفظ"}</Button>
            </DialogFooter>
        </DialogContent>
    );
};


export default function SnippetsPage() {
    const { toast } = useToast();
    const [isSnippetDialogOpen, setIsSnippetDialogOpen] = React.useState(false);
    const [isToolDialogOpen, setIsToolDialogOpen] = React.useState(false);

    const [snippets, setSnippets] = React.useState<Snippet[]>([]);
    const [tools, setTools] = React.useState<Tool[]>([]);
    const [isLoadingSnippets, setIsLoadingSnippets] = React.useState(true);
    const [isLoadingTools, setIsLoadingTools] = React.useState(true);

    const fetchSnippets = React.useCallback(async () => {
        setIsLoadingSnippets(true);
        try {
            const querySnapshot = await getDocs(collection(db, "snippets"));
            setSnippets(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Snippet)));
        } catch (error) {
            toast({ variant: "destructive", title: "خطأ بجلب الأكواد" });
        } finally {
            setIsLoadingSnippets(false);
        }
    }, [toast]);

    const fetchTools = React.useCallback(async () => {
        setIsLoadingTools(true);
        try {
            const querySnapshot = await getDocs(collection(db, "tools"));
            setTools(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tool)));
        } catch (error) {
            toast({ variant: "destructive", title: "خطأ بجلب الأدوات" });
        } finally {
            setIsLoadingTools(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchSnippets();
        fetchTools();
    }, [fetchSnippets, fetchTools]);
    
    const handleDelete = async (collectionName: string, item: Snippet | Tool, fetcher: () => void) => {
        if (!window.confirm("هل أنت متأكد؟")) return;
        try {
            await deleteDoc(doc(db, collectionName, item.id));
            toast({ title: "تم الحذف بنجاح" });
            fetcher();
        } catch (e) {
            toast({ variant: "destructive", title: "خطأ أثناء الحذف" });
        }
    };


  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader title="الأكواد والأدوات" description="مجموعتك الشخصية من الأكواد والموارد." />
      <Tabs defaultValue="snippets" className="max-w-4xl">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="snippets"><FileCode className="w-4 h-4 ml-2" />الأكواد</TabsTrigger>
          <TabsTrigger value="tools"><LinkIcon className="w-4 h-4 ml-2" />الأدوات</TabsTrigger>
          <TabsTrigger value="ui-library"><Puzzle className="w-4 h-4 ml-2" />مكتبة الواجهة</TabsTrigger>
        </TabsList>

        <TabsContent value="snippets">
            <div className="text-left my-4">
                 <Dialog open={isSnippetDialogOpen} onOpenChange={setIsSnippetDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className="ml-2 h-4 w-4" /> إضافة كود</Button>
                    </DialogTrigger>
                    <SnippetForm onSave={() => { fetchSnippets(); setIsSnippetDialogOpen(false); }} onClose={() => setIsSnippetDialogOpen(false)} />
                 </Dialog>
            </div>
            <div className="space-y-4">
                {isLoadingSnippets ? Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-40 w-full" />) :
                snippets.length > 0 ? snippets.map(snippet => (
                    <Card key={snippet.id}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle>{snippet.title}</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete('snippets', snippet, fetchSnippets)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </div>
                            <CardDescription>{snippet.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="p-4 bg-muted rounded-md text-sm overflow-x-auto font-code text-left" dir="ltr">
                                <pre><code>{snippet.code}</code></pre>
                            </div>
                        </CardContent>
                    </Card>
                )) : <p className="text-muted-foreground text-center py-8">لا توجد أكواد محفوظة.</p>}
            </div>
        </TabsContent>

        <TabsContent value="tools">
            <div className="text-left my-4">
                 <Dialog open={isToolDialogOpen} onOpenChange={setIsToolDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className="ml-2 h-4 w-4" /> إضافة أداة</Button>
                    </DialogTrigger>
                    <ToolForm onSave={() => { fetchTools(); setIsToolDialogOpen(false); }} onClose={() => setIsToolDialogOpen(false)} />
                 </Dialog>
            </div>
           <Card>
            <CardHeader>
              <CardTitle>الأدوات المفضلة</CardTitle>
               <CardDescription>قائمة بالأدوات والخدمات أونلاين اللي تستخدمها دايمًا للتطوير والتصميم.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoadingTools ? <Skeleton className="h-24 w-full" /> :
                tools.length > 0 ? (
                    <ul className="list-disc list-inside space-y-2">
                        {tools.map(tool => (
                            <li key={tool.id} className="flex justify-between items-center">
                                <div>
                                    <a href={tool.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{tool.name}</a>
                                     - <span>{tool.description}</span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete('tools', tool, fetchTools)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-muted-foreground text-center py-8">لا توجد أدوات محفوظة.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ui-library">
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[40vh]">
                <div className="flex flex-col items-center gap-1 text-center">
                    <h3 className="text-2xl font-bold tracking-tight">
                        مكتبة الواجهة فارغة.
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        أضف الخطوط والأيقونات وأصول الواجهة الثانية هنا.
                    </p>
                </div>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
