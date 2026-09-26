
"use client";

import * as React from "react";
import { db } from "@/lib/db";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal } from "lucide-react";
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


interface Client {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    notes: string;
}


const ClientForm = ({ 
    client, 
    onSave, 
    onClose 
}: { 
    client?: Client | null, 
    onSave: () => void, 
    onClose: () => void 
}) => {
  const { toast } = useToast();
  const [name, setName] = React.useState(client?.name || "");
  const [company, setCompany] = React.useState(client?.company || "");
  const [email, setEmail] = React.useState(client?.email || "");
  const [phone, setPhone] = React.useState(client?.phone || "");
  const [notes, setNotes] = React.useState(client?.notes || "");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async () => {
    if (!name) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "الرجاء تعبئة اسم العميل.",
        });
        return;
    }
    setIsLoading(true);
    try {
        const clientData = { name, company, email, phone, notes };

        if (client) {
            const clientRef = doc(db, "clients", client.id);
            await updateDoc(clientRef, clientData);
            toast({ title: "تم تحديث العميل بنجاح!" });
        } else {
            await addDoc(collection(db, "clients"), clientData);
            toast({ title: "تم إضافة العميل بنجاح!" });
        }
        
        onSave();
        onClose();
    } catch (error) {
        console.error("Error saving client: ", error);
        toast({
            variant: "destructive",
            title: "حدث خطأ",
            description: "لم نتمكن من حفظ العميل. الرجاء المحاولة مرة أخرى.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
            <DialogTitle>{client ? "تعديل عميل" : "إضافة عميل جديد"}</DialogTitle>
            <DialogDescription>
                عبّي تفاصيل العميل. اضغط على "حفظ" لما تخلص.
            </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-right">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="client-name" className="text-right">اسم العميل</Label>
                <Input id="client-name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="company" className="text-right">الشركة</Label>
                <Input id="company" value={company} onChange={e => setCompany(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">الإيميل</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="col-span-3" dir="ltr" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">رقم الجوال</Label>
                <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="col-span-3" dir="ltr" />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right pt-2">ملاحظات</Label>
                <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="col-span-3" rows={4} />
            </div>
        </div>
        <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'جاري الحفظ...' : 'حفظ العميل'}
            </Button>
        </DialogFooter>
    </DialogContent>
  );
};


export default function ClientsPage() {
  const { toast } = useToast();
  const [clients, setClients] = React.useState<Client[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
        const querySnapshot = await getDocs(collection(db, "clients"));
        const clientsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
        setClients(clientsData);
    } catch (error) {
        console.error("Error fetching clients: ", error);
        toast({
            variant: "destructive",
            title: "حدث خطأ أثناء جلب العملاء.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchClients();
  }, []);

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsDialogOpen(true);
  };

  const handleDelete = async (client: Client) => {
    if (!window.confirm("هل أنت متأكد أنك تريد حذف هذا العميل؟")) return;
    try {
        await deleteDoc(doc(db, "clients", client.id));
        toast({ title: "تم حذف العميل بنجاح" });
        fetchClients();
    } catch (error) {
        console.error("Error deleting client: ", error);
        toast({
            variant: "destructive",
            title: "حدث خطأ أثناء حذف العميل.",
        });
    }
  };
  
  const handleOpenDialog = () => {
      setSelectedClient(null);
      setIsDialogOpen(true);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader
        title="العملاء"
        description="إدارة معلومات عملائك."
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <PlusCircle className="ml-2 h-4 w-4" />
              إضافة عميل
            </Button>
          </DialogTrigger>
          <ClientForm 
            client={selectedClient} 
            onSave={() => {
                fetchClients();
                setIsDialogOpen(false);
            }}
            onClose={() => setIsDialogOpen(false)}
            />
        </Dialog>
      </PageHeader>
      <div className="border rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead className="hidden sm:table-cell">الشركة</TableHead>
              <TableHead className="hidden md:table-cell">الإيميل</TableHead>
              <TableHead>
                <span className="sr-only">الإجراءات</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                ))
            ) : clients.length > 0 ? (
                clients.map(client => (
                    <TableRow key={client.id}>
                        <TableCell>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-muted-foreground sm:hidden">{client.company}</p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{client.company}</TableCell>
                        <TableCell className="hidden md:table-cell">{client.email}</TableCell>
                        <TableCell>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">فتح القائمة</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(client)}>تعديل</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(client)} className="text-destructive">حذف</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                        ما فيه عملاء حالياً.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
