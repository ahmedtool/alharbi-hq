
"use client";

import * as React from "react";
import { db } from "@/lib/db";
import { collection, getDocs, query, orderBy, doc, updateDoc, setDoc, deleteDoc, getDoc, writeBatch } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { ar } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Edit, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface Invoice {
    id: string;
    invoiceNumber: string;
    clientName: string;
    total: number;
    invoiceDate: string;
    dueDate: string;
    status: "paid" | "unpaid" | "overdue";
    paymentMethod: string;
    internalNotes: string;
}

const EditInvoiceDialog = ({ invoice, onSave, onClose }: { invoice: Invoice, onSave: () => void, onClose: () => void }) => {
    const { toast } = useToast();
    const [status, setStatus] = React.useState(invoice.status);
    const [paymentMethod, setPaymentMethod] = React.useState(invoice.paymentMethod);
    const [internalNotes, setInternalNotes] = React.useState(invoice.internalNotes);
    const [isLoading, setIsLoading] = React.useState(false);

    const handleSaveChanges = async () => {
        setIsLoading(true);
        const invoiceRef = doc(db, "invoices", invoice.id);
        const transactionId = `inv_${invoice.id}`;
        const transactionRef = doc(db, "transactions", transactionId);

        try {
            await updateDoc(invoiceRef, { status, paymentMethod, internalNotes });

             if (status === 'paid') {
                const invoiceDoc = await getDoc(invoiceRef);
                const invoiceData = invoiceDoc.data();
                if(invoiceData) {
                    await setDoc(transactionRef, {
                        id: transactionId,
                        description: `دخل من الفاتورة #${invoiceData.invoiceNumber}`,
                        amount: invoiceData.total,
                        type: 'income',
                        category: 'دخل فواتير',
                        date: new Date().toISOString()
                    });
                }
            } else {
                if ((await getDoc(transactionRef)).exists()) {
                    await deleteDoc(transactionRef);
                }
            }

            toast({ title: "تم تحديث الفاتورة بنجاح" });

            onSave();
            onClose();
        } catch (error) {
            console.error("Error updating invoice:", error);
            toast({ variant: "destructive", title: "خطأ في تحديث الفاتورة" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>تعديل حالة الفاتورة #{invoice.invoiceNumber}</DialogTitle>
                <DialogDescription>
                    قم بتحديث حالة الدفع أو الملاحظات الداخلية لهذه الفاتورة.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4 text-right">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">حالة الفاتورة</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as Invoice['status'])}>
                        <SelectTrigger id="status" className="col-span-3">
                            <SelectValue placeholder="اختر الحالة" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unpaid">قائمة (غير مدفوعة)</SelectItem>
                            <SelectItem value="paid">مدفوعة</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="paymentMethod" className="text-right">طريقة الدفع</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger id="paymentMethod" className="col-span-3">
                            <SelectValue placeholder="اختر طريقة الدفع" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="تحويل بنكي">تحويل بنكي</SelectItem>
                            <SelectItem value="متجر سلة">متجر سلة</SelectItem>
                            <SelectItem value="نقدي">نقدي</SelectItem>
                            <SelectItem value="أخرى">أخرى</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="internalNotes" className="text-right pt-2">ملاحظات داخلية</Label>
                    <Textarea id="internalNotes" value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="ملاحظات خاصة لك..." className="col-span-3" rows={4} />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
                <Button onClick={handleSaveChanges} disabled={isLoading}>
                    {isLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : "حفظ التغييرات"}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}

export default function InvoicesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedRows, setSelectedRows] = React.useState<string[]>([]);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchInvoices = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const q = query(collection(db, "invoices"), orderBy("invoiceDate", "desc"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => {
            const invoiceData = doc.data();
            const today = new Date();
            today.setHours(0,0,0,0);
            const dueDate = parseISO(invoiceData.dueDate);
            let status = invoiceData.status || "unpaid";
            if (status === 'unpaid' && dueDate < today) {
                status = "overdue";
            }
            return { 
                id: doc.id, 
                ...invoiceData,
                status,
                paymentMethod: invoiceData.paymentMethod || 'تحويل بنكي',
                internalNotes: invoiceData.internalNotes || '',
            } as Invoice
        });
        setInvoices(data);
    } catch (error) {
        toast({ variant: "destructive", title: "حدث خطأ أثناء جلب الفواتير." });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
        case 'paid':
            return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">مدفوعة</Badge>;
        case 'overdue':
            return <Badge variant="destructive">متأخرة</Badge>;
        case 'unpaid':
        default:
            return <Badge variant="secondary">قائمة</Badge>;
    }
  }

  const handleEditClick = (invoice: Invoice) => {
      setSelectedInvoice(invoice);
      setIsDialogOpen(true);
  }

  const handleDeleteInvoice = async (invoice: Invoice) => {
      if (!window.confirm("هل أنت متأكد من حذف هذه الفاتورة؟ سيتم حذف المعاملة المالية المرتبطة بها أيضًا.")) return;

      try {
          // Delete invoice
          await deleteDoc(doc(db, "invoices", invoice.id));

          // Delete associated transaction
          const transactionId = `inv_${invoice.id}`;
          const transactionRef = doc(db, "transactions", transactionId);
          if ((await getDoc(transactionRef)).exists()) {
              await deleteDoc(transactionRef);
          }
          
          toast({ title: "تم حذف الفاتورة بنجاح" });
          fetchInvoices();

      } catch (error) {
          console.error("Error deleting invoice:", error);
          toast({ variant: "destructive", title: "خطأ في حذف الفاتورة" });
      }
  }

    const handleSelectRow = (id: string) => {
        setSelectedRows(prev => 
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (checked: boolean | string) => {
        if (checked) {
            setSelectedRows(invoices.map(inv => inv.id));
        } else {
            setSelectedRows([]);
        }
    };
    
    const handleBulkDelete = async () => {
        if (selectedRows.length === 0) return;
        setIsDeleting(true);
        try {
            const batch = writeBatch(db);
            selectedRows.forEach(id => {
                const invoiceRef = doc(db, "invoices", id);
                batch.delete(invoiceRef);

                const transactionId = `inv_${id}`;
                const transactionRef = doc(db, "transactions", transactionId);
                batch.delete(transactionRef); // This won't throw error if doc doesn't exist
            });
            await batch.commit();

            toast({ title: `تم حذف ${selectedRows.length} فاتورة بنجاح` });

            fetchInvoices();
            setSelectedRows([]);

        } catch (error) {
            console.error("Error deleting invoices:", error);
            toast({ variant: "destructive", title: "خطأ في حذف الفواتير" });
        } finally {
            setIsDeleting(false);
        }
    }


  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader
        title="الفواتير"
        description="عرض وإدارة جميع الفواتير الصادرة."
      >
        <Button asChild>
            <Link href="/tools/invoice-generator">
                <PlusCircle className="ml-2 h-4 w-4" />
                إنشاء فاتورة جديدة
            </Link>
        </Button>
      </PageHeader>
      
      {selectedRows.length > 0 && (
          <div className="mb-4 flex items-center gap-4 p-3 bg-muted rounded-lg">
             <p className="text-sm font-medium">
                {new Intl.NumberFormat('ar-SA').format(selectedRows.length)} فاتورة محددة
             </p>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting}>
                        <Trash2 className="ml-2 h-4 w-4" />
                        حذف المحدد
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                        <AlertDialogDescription>
                            سيتم حذف {new Intl.NumberFormat('ar-SA').format(selectedRows.length)} فاتورة بشكل نهائي، بالإضافة إلى أي معاملات مالية مرتبطة بها. لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : "نعم، حذف"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
      )}

      <div className="border rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                    checked={selectedRows.length > 0 && selectedRows.length === invoices.length}
                    onCheckedChange={handleSelectAll}
                    aria-label="تحديد الكل"
                 />
              </TableHead>
              <TableHead>العميل</TableHead>
              <TableHead className="hidden md:table-cell">تاريخ الإصدار</TableHead>
              <TableHead>المبلغ الإجمالي</TableHead>
              <TableHead className="hidden sm:table-cell">الحالة</TableHead>
              <TableHead className="w-16">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                        <TableCell>
                            <Skeleton className="h-5 w-24 mb-1" />
                            <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                    </TableRow>
                ))
            ) : invoices.length > 0 ? (
                invoices.map(invoice => (
                    <TableRow key={invoice.id} data-state={selectedRows.includes(invoice.id) && "selected"}>
                        <TableCell>
                            <Checkbox
                                checked={selectedRows.includes(invoice.id)}
                                onCheckedChange={() => handleSelectRow(invoice.id)}
                                aria-label={`تحديد الفاتورة ${invoice.invoiceNumber}`}
                            />
                        </TableCell>
                        <TableCell>
                            <p className="font-medium hover:underline cursor-pointer" onClick={() => router.push(`/tools/invoice-generator?id=${invoice.id}`)}>
                                {invoice.clientName}
                            </p>
                            <p className="text-sm text-muted-foreground">{invoice.invoiceNumber}</p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{format(parseISO(invoice.invoiceDate), "yyyy-MM-dd", { locale: ar })}</TableCell>
                        <TableCell dir="ltr">{new Intl.NumberFormat('ar-SA').format(invoice.total)} <span className="saudi-riyal">&#xea;</span></TableCell>
                        <TableCell className="hidden sm:table-cell">{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">فتح القائمة</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditClick(invoice)}>
                                        <Edit className="ml-2 h-4 w-4"/> تعديل
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteInvoice(invoice)} className="text-destructive">
                                         <Trash2 className="ml-2 h-4 w-4" /> حذف
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                        لا توجد فواتير محفوظة حاليًا.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {selectedInvoice && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <EditInvoiceDialog 
                invoice={selectedInvoice}
                onSave={fetchInvoices}
                onClose={() => setIsDialogOpen(false)}
            />
        </Dialog>
      )}
    </div>
  );
}
