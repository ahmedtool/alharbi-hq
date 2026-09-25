
"use client";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Lightbulb, Trash2, Loader2, Link as LinkIcon, Briefcase } from "lucide-react";
import React, { useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, orderBy, query } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Idea {
    id: string;
    title: string;
    description: string;
    projectId?: string;
    projectName?: string;
    createdAt: any;
}

interface Project {
    id: string;
    name: string;
}

export default function IdeasPage() {
    const { toast } = useToast();
    const [ideas, setIdeas] = React.useState<Idea[]>([]);
    const [projects, setProjects] = React.useState<Project[]>([]);

    const [title, setTitle] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [selectedProject, setSelectedProject] = React.useState("");

    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const ideasQuery = query(collection(db, "ideas"), orderBy("createdAt", "desc"));
            const ideasSnapshot = await getDocs(ideasQuery);
            const ideasData = ideasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Idea));
            setIdeas(ideasData);

            const projectsSnapshot = await getDocs(collection(db, "projects"));
            const projectsData = projectsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Project));
            setProjects(projectsData);

        } catch (error) {
            console.error("Error fetching data: ", error);
            toast({ variant: "destructive", title: "حدث خطأ أثناء جلب البيانات." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSaveIdea = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) {
            toast({ variant: "destructive", title: "خطأ", description: "الرجاء تعبئة عنوان ووصف الفكرة." });
            return;
        }
        setIsSaving(true);
        try {
            const project = projects.find(p => p.id === selectedProject);

            await addDoc(collection(db, "ideas"), { 
                title, 
                description,
                projectId: project?.id || null,
                projectName: project?.name || null,
                createdAt: new Date(),
            });
            toast({ title: "تم حفظ الفكرة بنجاح!" });
            
            setTitle("");
            setDescription("");
            setSelectedProject("");
            fetchData();
        } catch (error) {
            console.error("Error saving idea: ", error);
            toast({ variant: "destructive", title: "حدث خطأ", description: "لم نتمكن من حفظ الفكرة." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteIdea = async (id: string) => {
        if (!window.confirm("هل أنت متأكد أنك تريد حذف هذه الفكرة؟")) return;
        try {
            await deleteDoc(doc(db, "ideas", id));
            toast({ title: "تم حذف الفكرة بنجاح" });
            fetchData();
        } catch (error) {
            console.error("Error deleting idea: ", error);
            toast({ variant: "destructive", title: "حدث خطأ أثناء حذف الفكرة." });
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 text-right">
            <PageHeader title="مركز الأفكار" description="سجل أفكارك الرهيبة قبل لا تطير، واربطها بمشاريعك."/>
            <main className="grid flex-1 items-start gap-8 max-w-4xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>أضف فكرة جديدة</CardTitle>
                        <CardDescription>عبّي التفاصيل تحت عشان تحفظ فكرتك الجديدة.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSaveIdea}>
                        <CardContent className="grid gap-4">
                            <Input 
                                placeholder="عنوان الفكرة (مثال: مساعد شخصي بالذكاء الاصطناعي)" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                disabled={isSaving}
                                required
                            />
                            <Textarea 
                                placeholder="اوصف فكرتك بتفصيل أكثر..." 
                                rows={5}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={isSaving}
                                required
                            />
                             <Select value={selectedProject} onValueChange={setSelectedProject} disabled={isSaving}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اربط الفكرة بمشروع (اختياري)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">بدون مشروع (فكرة شخصية)</SelectItem>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                        <CardFooter className="justify-end">
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <Lightbulb className="ml-2 h-4 w-4"/>}
                                {isSaving ? "جاري الحفظ..." : "حفظ الفكرة"}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <div className="space-y-4">
                    <h2 className="text-2xl font-bold">أفكارك المحفوظة</h2>
                     {isLoading ? (
                        <div className="grid gap-4 md:grid-cols-2">
                             {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                        </div>
                     ) : ideas.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2">
                        {ideas.map(idea => (
                            <Card key={idea.id} className="group/idea flex flex-col">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="flex items-center gap-2">
                                            <Lightbulb className="text-amber-400 h-5 w-5"/>
                                            {idea.title}
                                        </CardTitle>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteIdea(idea.id)} className="text-muted-foreground hover:text-destructive h-8 w-8 opacity-0 group-hover/idea:opacity-100 transition-opacity">
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-sm text-muted-foreground">{idea.description}</p>
                                </CardContent>
                                <CardFooter>
                                    {idea.projectName ? (
                                        <Badge variant="secondary">
                                            <Briefcase className="ml-1 h-3 w-3" />
                                            {idea.projectName}
                                        </Badge>
                                    ) : (
                                         <Badge variant="outline">
                                            فكرة شخصية
                                        </Badge>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                        </div>
                    ) : (
                         <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-48">
                            <div className="flex flex-col items-center gap-2 text-center">
                                <h3 className="text-xl font-bold tracking-tight">لم تسجل أي أفكار بعد.</h3>
                                <p className="text-sm text-muted-foreground">ابدأ بكتابة أول فكرة لك في النموذج أعلاه.</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
