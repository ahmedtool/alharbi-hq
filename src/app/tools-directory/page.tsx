
"use client";

import * as React from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Link as LinkIcon, Trash2 } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

interface Tool {
    id: string;
    name: string;
    description: string;
    url: string;
    category: string;
}

const ToolForm = ({ 
    tool, 
    onSave, 
    onClose 
}: { 
    tool?: Tool | null, 
    onSave: () => void, 
    onClose: () => void 
}) => {
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (tool) {
        setName(tool.name || "");
        setDescription(tool.description || "");
        setUrl(tool.url || "");
        setCategory(tool.category || "");
    } else {
        setName("");
        setDescription("");
        setUrl("");
        setCategory("");
    }
  }, [tool]);

  const handleSubmit = async () => {
    if (!name || !url || !category) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "الرجاء تعبئة جميع الحقول: الاسم، الرابط، والتصنيف.",
        });
        return;
    }
    setIsLoading(true);
    try {
        const toolData = { name, description, url, category };

        if (tool) {
            const toolRef = doc(db, "public_tools", tool.id);
            await updateDoc(toolRef, toolData);
            toast({ title: "تم تحديث الرابط بنجاح!" });
        } else {
            await addDoc(collection(db, "public_tools"), toolData);
            toast({ title: "تم إضافة الرابط بنجاح!" });
        }
        onSave();
        onClose();
    } catch (error) {
        console.error("Error saving tool: ", error);
        toast({
            variant: "destructive",
            title: "حدث خطأ",
            description: "لم نتمكن من حفظ الرابط.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
        <DialogHeader>
            <DialogTitle>{tool ? "تعديل رابط" : "إضافة رابط جديد"}</DialogTitle>
            <DialogDescription>
                أدخل تفاصيل الأداة أو الموقع الذي تريد إضافته للمكتبة العامة.
            </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-right">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="toolName" className="text-right">الاسم</Label>
                <Input id="toolName" value={name} onChange={e => setName(e.target.value)} className="col-span-3" placeholder="مثال: Figma" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="url" className="text-right">الرابط</Label>
                <Input id="url" dir="ltr" value={url} onChange={e => setUrl(e.target.value)} className="col-span-3" placeholder="https://figma.com" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">التصنيف</Label>
                <Input id="category" value={category} onChange={e => setCategory(e.target.value)} className="col-span-3" placeholder="مثال: تصميم، تطوير، إنتاجية"/>
            </div>
             <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">الوصف</Label>
                <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="وصف موجز للأداة..." className="col-span-3" rows={3} />
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


export default function ToolsDirectoryPage() {
  const { toast } = useToast();
  const [tools, setTools] = React.useState<Tool[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedTool, setSelectedTool] = React.useState<Tool | null>(null);

  const fetchTools = React.useCallback(async () => {
    setIsLoading(true);
    try {
        // This page is now disconnected from the public tools page.
        // It now fetches from `tools` collection instead of `public_tools`.
        const q = query(collection(db, "tools"), orderBy("category"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tool));
        setTools(data);
    } catch (error) {
        toast({ variant: "destructive", title: "حدث خطأ أثناء جلب الروابط." });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const handleEdit = (tool: Tool) => {
    setSelectedTool(tool);
    setIsDialogOpen(true);
  };

  const handleDelete = async (tool: Tool) => {
    if (!window.confirm(`هل أنت متأكد أنك تريد حذف رابط "${tool.name}"؟`)) return;
    try {
        await deleteDoc(doc(db, "tools", tool.id));
        toast({ title: "تم حذف الرابط بنجاح" });
        fetchTools();
    } catch (error) {
        toast({ variant: "destructive", title: "حدث خطأ أثناء حذف الرابط." });
    }
  };
  
  const handleOpenDialog = (tool: Tool | null = null) => {
      setSelectedTool(tool);
      setIsDialogOpen(true);
  }

  const groupedTools = React.useMemo(() => {
      return tools.reduce((acc, tool) => {
          const category = tool.category || 'غير مصنف';
          if (!acc[category]) {
              acc[category] = [];
          }
          acc[category].push(tool);
          return acc;
      }, {} as Record<string, Tool[]>);
  }, [tools]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader
        title="إدارة الروابط الخاصة"
        description="إدارة قائمة الروابط والموارد الخاصة بك."
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="ml-2 h-4 w-4" />
              إضافة رابط جديد
            </Button>
          </DialogTrigger>
          <ToolForm 
            tool={selectedTool} 
            onSave={() => {
                fetchTools();
                setIsDialogOpen(false);
            }}
            onClose={() => setIsDialogOpen(false)}
            />
        </Dialog>
      </PageHeader>
      
      {isLoading ? (
          <div className="space-y-6">
              <Skeleton className="h-12 w-1/3" />
              <div className="border rounded-lg shadow-sm">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead className="w-1/4">الاسم</TableHead>
                              <TableHead className="w-1/2">الوصف</TableHead>
                              <TableHead>الإجراءات</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {Array.from({ length: 3 }).map((_, i) => (
                              <TableRow key={i}>
                                  <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </div>
          </div>
      ) : Object.keys(groupedTools).length > 0 ? (
          <div className="space-y-8">
              {Object.entries(groupedTools).map(([category, toolList]) => (
                   <div key={category}>
                        <h2 className="text-2xl font-bold mb-4">{category}</h2>
                        <div className="border rounded-lg shadow-sm">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[25%]">الاسم</TableHead>
                              <TableHead className="w-[50%]">الوصف</TableHead>
                              <TableHead>الإجراءات</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {toolList.map(tool => (
                                <TableRow key={tool.id}>
                                    <TableCell className="font-medium">{tool.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{tool.description}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" asChild>
                                                <a href={tool.url} target="_blank" rel="noopener noreferrer">
                                                    <LinkIcon className="h-3.5 w-3.5"/>
                                                </a>
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">فتح القائمة</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(tool)}>تعديل</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(tool)} className="text-destructive">حذف</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                   </div>
              ))}
          </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm min-h-[50vh]">
            <div className="flex flex-col items-center gap-4 text-center">
            <h3 className="text-2xl font-bold tracking-tight">
                لا توجد روابط محفوظة.
            </h3>
            <p className="text-sm text-muted-foreground">
                ابدأ بإضافة أول رابط أو مورد خاص بك.
            </p>
             <Button onClick={() => handleOpenDialog()}>
                <PlusCircle className="ml-2 h-4 w-4" />
                إضافة رابط جديد
            </Button>
            </div>
        </div>
      )}
    </div>
  );
}
