
"use client";

import * as React from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Hash, Link as LinkIcon, Trash2, FileText, Check, Loader2, Upload } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NumberedLink {
    id: string;
    number: string;
    title: string;
    description: string;
    url: string;
    type: 'link' | 'tool' | 'file';
    fileName?: string;
}

const NumberedLinkForm = ({ 
    item, 
    onSave, 
    onClose 
}: { 
    item?: NumberedLink | null, 
    onSave: () => void, 
    onClose: () => void 
}) => {
  const { toast } = useToast();
  const [number, setNumber] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [type, setType] = React.useState<'link' | 'tool' | 'file'>('link');
  const [file, setFile] = React.useState<File | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // منطق توليد الرقم التالي - يبدأ من 1
  const generateNextNumber = React.useCallback(async () => {
      try {
          const q = query(collection(db, "numbered_links"));
          const snap = await getDocs(q);
          if (!snap.empty) {
              // تحويل الأرقام إلى نصوص عددية للحصول على الماكس الحقيقي
              const numbers = snap.docs.map(doc => parseInt(doc.data().number) || 0);
              const maxNum = Math.max(...numbers);
              setNumber((maxNum + 1).toString());
          } else {
              setNumber("1"); // البداية من 1 إذا كانت فارغة
          }
      } catch (error) {
          console.error("Error generating number:", error);
          setNumber("1");
      }
  }, []);

  React.useEffect(() => {
    if (item) {
        setNumber(item.number || "");
        setTitle(item.title || "");
        setDescription(item.description || "");
        setUrl(item.url || "");
        setType(item.type || 'link');
    } else {
        setTitle("");
        setDescription("");
        setUrl("");
        setType('link');
        generateNextNumber();
    }
  }, [item, generateNextNumber]);

  const handleSubmit = async () => {
    if (!title || (type !== 'file' && !url) || (type === 'file' && !file && !item)) {
        toast({ variant: "destructive", title: "خطأ", description: "الرجاء تعبئة جميع الحقول المطلوبة." });
        return;
    }
    setIsLoading(true);
    try {
        let finalUrl = url;
        let fileName = item?.fileName || "";

        if (type === 'file' && file) {
            const storagePath = `numbered_links/${number}_${file.name}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            finalUrl = await getDownloadURL(storageRef);
            fileName = file.name;
        }

        const data = { 
            number, 
            title, 
            description, 
            url: finalUrl, 
            type,
            fileName,
            active: true
        };

        if (item) {
            await updateDoc(doc(db, "numbered_links", item.id), data);
            toast({ title: "تم التحديث بنجاح!" });
        } else {
            await addDoc(collection(db, "numbered_links"), { ...data, createdAt: new Date() });
            toast({ title: "تمت إضافة الرقم بنجاح!" });
        }
        onSave();
        onClose();
    } catch (error) {
        console.error("Error saving numbered link:", error);
        toast({ variant: "destructive", title: "حدث خطأ أثناء الحفظ" });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md text-right">
        <DialogHeader>
            <DialogTitle>{item ? "تعديل رقم" : "إضافة رقم وصول جديد"}</DialogTitle>
            <DialogDescription>سيتم توليد الرقم تلقائياً بالتسلسل (1, 2, 3...).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="num" className="text-right">الرقم الحالي</Label>
                <Input id="num" value={number} readOnly className="col-span-3 text-center font-bold bg-muted" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">العنوان</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} className="col-span-3" placeholder="مثلاً: أداة تعديل الصور" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">النوع</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="link">رابط خارجي</SelectItem>
                        <SelectItem value="file">رفع ملف من جهازي</SelectItem>
                        <SelectItem value="tool">أداة داخلية</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {type === 'file' ? (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">الملف</Label>
                    <div className="col-span-3">
                        <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="cursor-pointer" />
                        {item?.fileName && !file && <p className="text-xs text-muted-foreground mt-1">الملف الحالي: {item.fileName}</p>}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="url" className="text-right">الرابط/URL</Label>
                    <Input id="url" dir="ltr" value={url} onChange={e => setUrl(e.target.value)} className="col-span-3" placeholder="https://..." />
                </div>
            )}

            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="desc" className="text-right pt-2">الوصف</Label>
                <span className="col-span-3 text-xs text-muted-foreground mb-1">يظهر للمستخدم عند البحث عن الرقم.</span>
                <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} className="col-span-3" rows={3} placeholder="شرح بسيط لمحتوى الرقم" />
            </div>
        </div>
        <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : (item ? 'حفظ التعديلات' : 'إضافة الرقم')}
            </Button>
        </DialogFooter>
    </DialogContent>
  );
};

export default function NumberedLinksPage() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<NumberedLink[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<NumberedLink | null>(null);

  const fetchItems = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const querySnapshot = await getDocs(collection(db, "numbered_links"));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NumberedLink));
        // فرز عددي تنازلي (الأحدث والأكبر رقماً في الأعلى)
        setItems(data.sort((a, b) => parseInt(b.number) - parseInt(a.number)));
    } catch (error) {
        toast({ variant: "destructive", title: "خطأ في جلب البيانات" });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (item: NumberedLink) => {
    if (!window.confirm(`هل أنت متأكد من حذف الرقم ${item.number}؟`)) return;
    try {
        await deleteDoc(doc(db, "numbered_links", item.id));
        toast({ title: "تم الحذف بنجاح" });
        fetchItems();
    } catch (error) {
        toast({ variant: "destructive", title: "حدث خطأ" });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader title="إدارة الوصول بالرقم" description="تحكم في الأرقام التي تظهر في صفحة البايو. الترقيم يبدأ من 1 ويتصاعد تلقائياً.">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setSelectedItem(null); setIsDialogOpen(true); }}>
              <PlusCircle className="ml-2 h-4 w-4" /> إضافة رقم جديد
            </Button>
          </DialogTrigger>
          <NumberedLinkForm item={selectedItem} onSave={fetchItems} onClose={() => setIsDialogOpen(false)} />
        </Dialog>
      </PageHeader>
      
      <div className="border rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 text-center">الرقم</TableHead>
              <TableHead>العنوان</TableHead>
              <TableHead className="hidden md:table-cell">النوع</TableHead>
              <TableHead className="w-20"><span className="sr-only">الإجراءات</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-8 w-12 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8 mx-auto" /></TableCell>
                    </TableRow>
                ))
            ) : items.length > 0 ? (
                items.map(item => (
                    <TableRow key={item.id}>
                        <TableCell className="font-bold text-center text-primary text-lg">#{item.number}</TableCell>
                        <TableCell>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-xs" dir="ltr">{item.url}</p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            {item.type === 'link' && <LinkIcon className="h-4 w-4 inline ml-1" />}
                            {item.type === 'tool' && <Hash className="h-4 w-4 inline ml-1" />}
                            {item.type === 'file' && <FileText className="h-4 w-4 inline ml-1" />}
                            {item.type === 'link' ? 'رابط' : item.type === 'tool' ? 'أداة' : 'ملف'}
                        </TableCell>
                        <TableCell>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">فتح القائمة</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => { setSelectedItem(item); setIsDialogOpen(true); }}>تعديل</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive">حذف</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">لا توجد أرقام وصول حالياً. اضغط "إضافة" للبدء من رقم 1.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
