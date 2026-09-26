
"use client";

import * as React from "react";
import { db } from "@/lib/db";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, Timestamp } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { CalendarIcon, PlusCircle, MoreHorizontal, Eye, Globe } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";


interface Project {
    id: string;
    name: string;
    description: string;
    budget: number;
    startDate: string;
    endDate: string;
    progress: number;
    clientId?: string;
    clientName?: string;
    isPublic: boolean;
}

interface Client {
    id: string;
    name: string;
}

const ProjectForm = ({ 
    project,
    clients, 
    onSave, 
    onClose 
}: { 
    project?: Project | null,
    clients: Client[], 
    onSave: () => void, 
    onClose: () => void 
}) => {
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [budget, setBudget] = React.useState(0);
  const [startDate, setStartDate] = React.useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
  const [progress, setProgress] = React.useState(0);
  const [clientId, setClientId] = React.useState<string | undefined>(undefined);
  const [isPublic, setIsPublic] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (project) {
        setName(project.name || "");
        setDescription(project.description || "");
        setBudget(project.budget || 0);
        setStartDate(project.startDate ? parseISO(project.startDate) : undefined);
        setEndDate(project.endDate ? parseISO(project.endDate) : undefined);
        setProgress(project.progress || 0);
        setClientId(project.clientId || undefined);
        setIsPublic(project.isPublic || false);
    } else {
        setName("");
        setDescription("");
        setBudget(0);
        setStartDate(new Date());
        setEndDate(undefined);
        setProgress(0);
        setClientId(undefined);
        setIsPublic(false);
    }
  }, [project]);


  const handleSubmit = async () => {
    if (!name || !startDate || !endDate) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "الرجاء تعبئة جميع الحقول المطلوبة.",
        });
        return;
    }
    setIsLoading(true);
    try {
        const selectedClient = clients.find(c => c.id === clientId);
        const projectData = {
            name,
            description,
            budget: Number(budget),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            progress: Number(progress),
            clientId: selectedClient?.id || null,
            clientName: selectedClient?.name || null,
            isPublic: isPublic,
        };

        if (project) {
            const projectRef = doc(db, "projects", project.id);
            await updateDoc(projectRef, projectData);
            toast({ title: "تم تحديث المشروع بنجاح!" });

        } else {
            await addDoc(collection(db, "projects"), projectData);
            toast({ title: "تم إنشاء المشروع بنجاح!" });
        }
        onSave();
        onClose();
    } catch (error) {
        console.error("Error saving project: ", error);
        toast({
            variant: "destructive",
            title: "حدث خطأ",
            description: "لم نتمكن من حفظ المشروع. الرجاء المحاولة مرة أخرى.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
        <DialogHeader>
            <DialogTitle>{project ? "تعديل مشروع" : "إنشاء مشروع جديد"}</DialogTitle>
            <DialogDescription>
                عبّي تفاصيل مشروعك تحت. اضغط على "حفظ" لما تخلص.
            </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-right">
            <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
                اسم المشروع
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="client" className="text-right">
                    العميل
                </Label>
                <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="اختر العميل (اختياري)" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">بدون عميل</SelectItem>
                        {clients.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">
                الوصف
            </Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" rows={3}/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="budget" className="text-right">
                الميزانية (ر.س)
            </Label>
            <div className="col-span-3 relative">
                <Input id="budget" type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="pl-7" />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 saudi-riyal">&#xea;</span>
            </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">فترة المشروع</Label>
            <div className="col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        variant={"outline"}
                        className={cn("justify-start text-right font-normal", !startDate && "text-muted-foreground")}
                        >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP", { locale: ar }) : <span>تاريخ البداية</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus locale={ar}/>
                    </PopoverContent>
                </Popover>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        variant={"outline"}
                        className={cn("justify-start text-right font-normal", !endDate && "text-muted-foreground")}
                        >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP", { locale: ar }) : <span>تاريخ النهاية</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus locale={ar} />
                    </PopoverContent>
                </Popover>
            </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="progress" className="text-right">
                نسبة الإنجاز
            </Label>
            <div className="col-span-3 flex items-center gap-2">
                <Slider
                    id="progress"
                    min={0}
                    max={100}
                    step={5}
                    value={[progress]}
                    onValueChange={(value) => setProgress(value[0])}
                    className="w-[80%]"
                />
                <span className="text-sm font-medium w-[20%] text-left">{new Intl.NumberFormat('ar-SA').format(Number(progress || 0))}%</span>
            </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="is-public" className="text-right">
                    الظهور
                </Label>
                <div className="col-span-3 flex items-center space-x-2 space-x-reverse">
                    <Checkbox id="is-public" checked={isPublic} onCheckedChange={(checked) => setIsPublic(Boolean(checked))} />
                    <label
                        htmlFor="is-public"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        عرض المشروع في الموقع العام
                    </label>
                </div>
            </div>
        </div>
        <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button type="submit" onClick={handleSubmit} disabled={isLoading}>{isLoading ? "جاري الحفظ..." : "حفظ المشروع"}</Button>
        </DialogFooter>
    </DialogContent>
  );
};


export default function ProjectsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const projectsSnapshot = await getDocs(collection(db, "projects"));
        const projectsData = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        setProjects(projectsData);

        const clientsSnapshot = await getDocs(collection(db, "clients"));
        const clientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
        setClients(clientsData);
    } catch (error) {
        console.error("Error fetching data: ", error);
        toast({
            variant: "destructive",
            title: "حدث خطأ أثناء جلب البيانات.",
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setIsDialogOpen(true);
  };

  const handleDelete = async (project: Project) => {
    if (!window.confirm("هل أنت متأكد أنك تريد حذف هذا المشروع؟")) return;
    try {
        await deleteDoc(doc(db, "projects", project.id));
        toast({ title: "تم حذف المشروع بنجاح" });
        fetchData();
    } catch (error) {
        console.error("Error deleting project: ", error);
        toast({
            variant: "destructive",
            title: "حدث خطأ أثناء حذف المشروع.",
        });
    }
  };
  
  const handleOpenDialog = () => {
      setSelectedProject(null);
      setIsDialogOpen(true);
  }


  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader
        title="المشاريع"
        description="نظم وتابع مشاريعك الشغالة."
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <PlusCircle className="ml-2 h-4 w-4" />
              مشروع جديد
            </Button>
          </DialogTrigger>
          <ProjectForm 
            project={selectedProject}
            clients={clients} 
            onSave={() => {
                fetchData();
                setIsDialogOpen(false);
            }}
            onClose={() => setIsDialogOpen(false)}
            />
        </Dialog>
      </PageHeader>
      
      {isLoading ? (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                    <CardFooter>
                         <Skeleton className="h-8 w-1/4" />
                    </CardFooter>
                </Card>
             ))}
         </div>
      ) : projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
                <Card 
                    key={project.id} 
                    className="flex flex-col hover:border-foreground/40 transition-shadow cursor-pointer"
                    onClick={() => router.push(`/projects/${project.id}`)}
                >
                    <CardHeader>
                        <div className="flex justify-between items-start">
                             <CardTitle className="mb-2">{project.name}</CardTitle>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">فتح القائمة</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuItem onClick={() => handleEdit(project)}>تعديل</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(project)} className="text-destructive">حذف</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <CardDescription className="line-clamp-2 h-10">{project.description || "لا يوجد وصف"}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-grow">
                         <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-muted-foreground">نسبة الإنجاز</span>
                                <span className="text-sm font-bold">{new Intl.NumberFormat('ar-SA').format(Number(project.progress || 0))}%</span>
                            </div>
                            <Progress value={Number(project.progress || 0)} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground" dir="ltr">{format(parseISO(project.startDate), "d LLL, y", { locale: ar })} - {format(parseISO(project.endDate), "d LLL, y", { locale: ar })}</p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <span className="font-bold text-lg" dir="ltr">{new Intl.NumberFormat('ar-SA').format(Number(project.budget || 0))} <span className="saudi-riyal">&#xea;</span></span>
                        <div className='flex items-center gap-2'>
                          {project.isPublic && <span title="مشروع عام"><Globe className="h-4 w-4 text-sky-500" aria-label="مشروع عام"/></span>}
                          {project.clientName && <span className="text-sm text-muted-foreground">العميل: {project.clientName}</span>}
                        </div>
                    </CardFooter>
                </Card>
            ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm min-h-[60vh]">
            <div className="flex flex-col items-center gap-4 text-center">
            <h3 className="text-2xl font-bold tracking-tight">
                ما عندك أي مشاريع حاليًا.
            </h3>
            <p className="text-sm text-muted-foreground">
                ابدأ بإنشاء مشروع جديد.
            </p>
             <Button onClick={handleOpenDialog}>
                <PlusCircle className="ml-2 h-4 w-4" />
                إنشاء مشروع
            </Button>
            </div>
        </div>
      )}
    </div>
  );
}
