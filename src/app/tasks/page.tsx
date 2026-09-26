
"use client";

import * as React from "react";
import { db } from "@/lib/db";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, Timestamp, where, query, limit, getDoc } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";


interface SubTask {
    id: number;
    text: string;
    completed: boolean;
}
interface Task {
    id: string;
    title: string;
    subTasks: SubTask[];
    project: string;
    priority: 'high' | 'medium' | 'low';
    status: 'todo' | 'inprogress' | 'done';
    completedAt?: Timestamp | null;
    progressImpact?: number;
}

interface Project {
    id: string;
    name: string;
}

const priorityMap = {
    high: { label: "عالية", variant: "destructive" as const },
    medium: { label: "متوسطة", variant: "secondary" as const },
    low: { label: "منخفضة", variant: "outline" as const },
};

const statusMap: {[key in Task['status']]: { label: string, className: string }} = {
    todo: { label: "مهام جديدة", className: "bg-blue-100 text-blue-800" },
    inprogress: { label: "قيد التنفيذ", className: "bg-yellow-100 text-yellow-800" },
    done: { label: "مكتملة", className: "bg-green-100 text-green-800" },
}

const TaskForm = ({ 
    task,
    projects,
    onSave, 
    onClose 
}: { 
    task?: Task | null, 
    projects: Project[],
    onSave: () => void, 
    onClose: () => void 
}) => {
  const { toast } = useToast();
  const [title, setTitle] = React.useState("");
  const [subTasks, setSubTasks] = React.useState<SubTask[]>([{ id: 1, text: '', completed: false }]);
  const [project, setProject] = React.useState("");
  const [priority, setPriority] = React.useState<Task['priority']>('medium');
  const [status, setStatus] = React.useState<Task['status']>('todo');
  const [progressImpact, setProgressImpact] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (task) {
        setTitle(task.title || "");
        setSubTasks(task.subTasks && task.subTasks.length > 0 ? task.subTasks : [{ id: 1, text: '', completed: false }]);
        setProject(task.project || "");
        setPriority(task.priority || 'medium');
        setStatus(task.status || 'todo');
        setProgressImpact(task.progressImpact || 0);
    } else {
        setTitle("");
        setSubTasks([{ id: 1, text: '', completed: false }]);
        setProject("");
        setPriority('medium');
        setStatus('todo');
        setProgressImpact(0);
    }
  }, [task]);

  const handleSubTaskChange = (id: number, text: string) => {
    setSubTasks(current => current.map(st => st.id === id ? {...st, text} : st));
  }
  const addSubTask = () => {
    setSubTasks(current => [...current, { id: Date.now(), text: '', completed: false}]);
  }
  const removeSubTask = (id: number) => {
    setSubTasks(current => current.filter(st => st.id !== id));
  }

  const handleSubmit = async () => {
    if (!title) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "الرجاء تعبئة عنوان المهمة.",
        });
        return;
    }
    setIsLoading(true);
    try {
        const finalSubTasks = subTasks.filter(st => st.text.trim() !== '');
        const completedCount = finalSubTasks.filter(st => st.completed).length;
        
        let newStatus = status;
        if (finalSubTasks.length > 0) {
            if (completedCount === finalSubTasks.length) {
                newStatus = 'done';
            } else if (completedCount > 0) {
                newStatus = 'inprogress';
            } else {
                newStatus = 'todo';
            }
        }
        
        const taskData: Omit<Task, 'id' | 'completedAt' | 'subTasks'> & { completedAt?: Timestamp | null, subTasks: SubTask[] } = { 
            title, 
            subTasks: finalSubTasks,
            project, 
            priority, 
            status: newStatus, 
            progressImpact: Number(progressImpact) || 0,
        };

        const isCompletingTask = newStatus === 'done' && task?.status !== 'done';
        const isReopeningTask = newStatus !== 'done' && task?.status === 'done';

        if (isCompletingTask) {
            taskData.completedAt = Timestamp.now();
        } else if (isReopeningTask || newStatus !== 'done') {
            taskData.completedAt = null;
        }

        if (task) {
            await updateDoc(doc(db, "tasks", task.id), taskData as any);
            toast({ title: "تم تعديل المهمة بنجاح!" });
        } else {
            await addDoc(collection(db, "tasks"), taskData);
            toast({ title: "تمت إضافة المهمة بنجاح!" });
        }
        
        onSave();
        onClose();
    } catch (error) {
        console.error("Error saving task: ", error);
        toast({
            variant: "destructive",
            title: "حدث خطأ",
            description: "لم نتمكن من حفظ المهمة. الرجاء المحاولة مرة أخرى.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
        <DialogHeader>
            <DialogTitle>{task ? "تعديل مهمة" : "إنشاء مهمة جديدة"}</DialogTitle>
            <DialogDescription>
                عبّي تفاصيل مهمتك الجديدة هنا. اضغط على "حفظ" لما تخلص.
            </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-right">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">عنوان المهمة</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} className="col-span-3" />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">المهام الفرعية</Label>
                <div className="col-span-3 space-y-2">
                    {subTasks.map((st, index) => (
                        <div key={st.id} className="flex items-center gap-2">
                            <Input
                                placeholder={`مهمة فرعية ${index + 1}`}
                                value={st.text}
                                onChange={e => handleSubTaskChange(st.id, e.target.value)}
                             />
                             <Button variant="ghost" size="icon" onClick={() => removeSubTask(st.id)} disabled={subTasks.length === 1}>
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive"/>
                            </Button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addSubTask}>
                        <PlusCircle className="ml-2 h-4 w-4" /> إضافة مهمة فرعية
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="project" className="text-right">المشروع</Label>
                 <Select value={project} onValueChange={setProject}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="اختر المشروع" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="شخصي">شخصي</SelectItem>
                        {projects.map(p => (
                            <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {project && project !== 'شخصي' && (
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="progressImpact" className="text-right">تأثير التقدم (%)</Label>
                    <Input 
                        id="progressImpact" 
                        type="number"
                        value={progressImpact} 
                        onChange={e => setProgressImpact(Number(e.target.value))} 
                        className="col-span-3"
                        placeholder="مثال: 5"
                        min="0"
                        max="100"
                    />
                </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">الأولوية</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Task['priority'])}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="اختر الأولوية" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="high">عالية</SelectItem>
                        <SelectItem value="medium">متوسطة</SelectItem>
                        <SelectItem value="low">منخفضة</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">الحالة</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as Task['status'])}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todo">جديد</SelectItem>
                        <SelectItem value="inprogress">قيد التنفيذ</SelectItem>
                        <SelectItem value="done">مكتمل</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
        <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button type="submit" onClick={handleSubmit} disabled={isLoading}>{isLoading ? "جاري الحفظ..." : "حفظ المهمة"}</Button>
        </DialogFooter>
    </DialogContent>
  );
};

const TaskCard = ({ task, onEdit, onDelete, onSubTaskToggle }: { task: Task, onEdit: (task: Task) => void, onDelete: (id: string) => void, onSubTaskToggle: (taskId: string, subTaskId: number, completed: boolean) => void }) => {
    return (
        <Card className="mb-4">
            <CardContent className="p-4">
                <div className="flex justify-between items-start">
                    <p className="font-bold">{task.title}</p>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">فتح القائمة</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(task)}>تعديل</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive">حذف</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                
                {task.subTasks && task.subTasks.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {task.subTasks.map(st => (
                            <div key={st.id} className="flex items-center gap-2">
                                <Checkbox
                                    id={`subtask-${task.id}-${st.id}`}
                                    checked={st.completed}
                                    onCheckedChange={(checked) => onSubTaskToggle(task.id, st.id, !!checked)}
                                />
                                <label htmlFor={`subtask-${task.id}-${st.id}`} className={`text-sm ${st.completed ? 'text-muted-foreground line-through' : ''}`}>{st.text}</label>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="flex items-center gap-2 mt-3">
                    <Badge variant={priorityMap[task.priority].variant}>
                        {priorityMap[task.priority].label}
                    </Badge>
                     <Badge variant="outline">{task.project || 'شخصي'}</Badge>
                </div>
            </CardContent>
        </Card>
    );
}

export default function TasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const tasksSnapshot = await getDocs(collection(db, "tasks"));
        const tasksData = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        setTasks(tasksData);

        const projectsSnapshot = await getDocs(collection(db, "projects"));
        const projectsData = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        setProjects(projectsData);

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

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setIsDialogOpen(true);
  };

  const handleDelete = async (taskId: string) => {
    if (!window.confirm("هل أنت متأكد أنك تريد حذف هذه المهمة؟")) return;
    try {
        await deleteDoc(doc(db, "tasks", taskId));
        toast({ title: "تم حذف المهمة بنجاح" });
        fetchData();
    } catch (error) {
        console.error("Error deleting task: ", error);
        toast({
            variant: "destructive",
            title: "حدث خطأ أثناء حذف المهمة.",
        });
    }
  };
  
  const handleOpenDialog = () => {
      setSelectedTask(null);
      setIsDialogOpen(true);
  }
  
  const handleSubTaskToggle = async (taskId: string, subTaskId: number, completed: boolean) => {
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;
    
    const updatedSubTasks = taskToUpdate.subTasks.map(st => 
        st.id === subTaskId ? { ...st, completed } : st
    );

    let newStatus = taskToUpdate.status;
    const completedCount = updatedSubTasks.filter(st => st.completed).length;
    const totalSubTasks = updatedSubTasks.length;

    if (totalSubTasks > 0) {
        if (completedCount === totalSubTasks) {
            newStatus = 'done';
        } else if (completedCount > 0) {
            newStatus = 'inprogress';
        } else {
            newStatus = 'todo';
        }
    }
    
    const statusChanged = newStatus !== taskToUpdate.status;
    const isCompletingTask = statusChanged && newStatus === 'done';
    const isReopeningTask = statusChanged && taskToUpdate.status === 'done';

    setTasks(currentTasks => currentTasks.map(t => 
        t.id === taskId ? { ...t, subTasks: updatedSubTasks, status: newStatus } : t
    ));

    try {
        const taskRef = doc(db, "tasks", taskId);
        const updateData: any = { 
            subTasks: updatedSubTasks,
        };

        if (statusChanged) {
            updateData.status = newStatus;
            if (isCompletingTask) {
                 updateData.completedAt = Timestamp.now();
            } else if (isReopeningTask) {
                 updateData.completedAt = null;
            }
        }
        
        await updateDoc(taskRef, updateData);
        
        const impact = Number(taskToUpdate.progressImpact);
        if (taskToUpdate.project && taskToUpdate.project !== 'شخصي' && impact > 0 && totalSubTasks > 0) {
             const projectQuery = query(collection(db, 'projects'), where('name', '==', taskToUpdate.project), limit(1));
             const projectSnapshot = await getDocs(projectQuery);

             if (!projectSnapshot.empty) {
                const projectDoc = projectSnapshot.docs[0];
                const projectRef = doc(db, 'projects', projectDoc.id);
                const individualImpact = impact / totalSubTasks;
                const progressChange = completed ? individualImpact : -individualImpact;

                const proj = await getDoc(projectRef);
                if (!proj.exists()) throw new Error("المشروع غير موجود!");

                const currentProgress = proj.data().progress || 0;
                let newProgress = currentProgress + progressChange;
                newProgress = Math.max(0, Math.min(100, newProgress));

                await updateDoc(projectRef, { progress: newProgress });
             }
        }

    } catch(error) {
        console.error("Error updating subtask/status:", error);
        toast({ variant: 'destructive', title: 'فشل تحديث المهمة.'});
        setTasks(tasks); // Revert local state on failure
    }
  }

  const columns = React.useMemo(() => {
      const todo = tasks.filter(t => t.status === 'todo');
      const inprogress = tasks.filter(t => t.status === 'inprogress');
      const done = tasks.filter(t => t.status === 'done');
      return { todo, inprogress, done };
  }, [tasks]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right h-full flex flex-col">
      <PageHeader
        title="المهام"
        description="نظم مهامك الشخصية واللي متعلقة بالمشاريع."
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <PlusCircle className="ml-2 h-4 w-4" />
              مهمة جديدة
            </Button>
          </DialogTrigger>
          <TaskForm 
            task={selectedTask}
            projects={projects}
            onSave={() => {
                fetchData();
                setIsDialogOpen(false);
            }}
            onClose={() => setIsDialogOpen(false)}
            />
        </Dialog>
      </PageHeader>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(Object.keys(statusMap) as Array<keyof typeof statusMap>).map((status) => (
                <div key={status} className="bg-muted/50 rounded-lg p-4">
                    <h2 className="font-bold mb-4 flex items-center gap-2">
                         <span className={`w-3 h-3 rounded-full ${statusMap[status].className}`}></span>
                         {statusMap[status].label}
                         <span className="text-sm text-muted-foreground">({columns[status].length})</span>
                    </h2>
                     <div className="space-y-4 md:h-[65vh] overflow-y-auto pr-1">
                        {isLoading ? (
                            Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-24 w-full"/>)
                        ) : columns[status].length > 0 ? (
                           columns[status].map(task => (
                               <TaskCard key={task.id} task={task} onEdit={handleEdit} onDelete={handleDelete} onSubTaskToggle={handleSubTaskToggle} />
                           ))
                        ) : (
                           <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                               <p>لا توجد مهام هنا.</p>
                           </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
