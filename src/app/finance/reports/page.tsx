
"use client";

import * as React from "react";
import { db } from "@/lib/db";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ArrowUp, ArrowDown, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from 'date-fns';
import { ar } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
}

const TransactionForm = ({
  transaction,
  onSave,
  onClose,
}: {
  transaction?: Transaction | null;
  onSave: () => void;
  onClose: () => void;
}) => {
  const { toast } = useToast();
  const [description, setDescription] = React.useState(transaction?.description || "");
  const [amount, setAmount] = React.useState(transaction?.amount || 0);
  const [type, setType] = React.useState<Transaction["type"]>(transaction?.type || "expense");
  const [category, setCategory] = React.useState(transaction?.category || "");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async () => {
    if (!description || !amount || !category) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الرجاء تعبئة جميع الحقول.",
      });
      return;
    }
    setIsLoading(true);
    try {
      const transactionData = {
        description,
        amount: Number(amount),
        type,
        category,
        date: transaction ? transaction.date : new Date().toISOString(), // Keep original date on edit
      };

      const transactionRef = doc(db, "transactions", transaction!.id);
      await updateDoc(transactionRef, transactionData);
      toast({ title: "تم تحديث المعاملة بنجاح!" });
      
      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving transaction: ", error);
      toast({
        variant: "destructive",
        title: "حدث خطأ",
        description: "لم نتمكن من حفظ المعاملة.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>تعديل معاملة</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4 text-right">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">الوصف</Label>
          <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="amount" className="text-right">المبلغ</Label>
          <div className="col-span-3 relative">
            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="pl-7" />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 saudi-riyal">&#xea;</span>
          </div>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="type" className="text-right">النوع</Label>
          <Select value={type} onValueChange={(v) => setType(v as Transaction["type"])}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="اختر النوع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">دخل</SelectItem>
              <SelectItem value="expense">مصروف</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="category" className="text-right">الفئة</Label>
          <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="col-span-3" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default function ReportsPage() {
    const { toast } = useToast();
    const [transactions, setTransactions] = React.useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);

    const fetchTransactions = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, "transactions"), orderBy("date", "desc"));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
            setTransactions(data);
        } catch (error) {
            toast({ variant: "destructive", title: "حدث خطأ أثناء جلب المعاملات." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const handleEdit = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsDialogOpen(true);
    };

    const handleDelete = async (transaction: Transaction) => {
        if (!window.confirm("هل أنت متأكد أنك تريد حذف هذه المعاملة؟")) return;
        try {
            // Prevent deleting invoice-related transactions
            if (transaction.id.startsWith('inv_') || transaction.id.startsWith('sub_')) {
                 toast({ variant: "destructive", title: "لا يمكن الحذف", description: "هذه المعاملة مرتبطة بفاتورة أو اشتراك. يرجى الحذف من هناك." });
                 return;
            }

            await deleteDoc(doc(db, "transactions", transaction.id));
            toast({ title: "تم حذف المعاملة بنجاح" });
            fetchTransactions();
        } catch (error) {
            toast({ variant: "destructive", title: "حدث خطأ أثناء حذف المعاملة." });
        }
    };

    const { income, expenses, netProfit } = React.useMemo(() => {
        const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const netProfit = income - expenses;
        return { income, expenses, netProfit };
    }, [transactions]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 text-right">
            <PageHeader
                title="التقارير المالية المفصلة"
                description="عرض وتحليل جميع معاملاتك المالية."
            />
            <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي الدخل</CardTitle>
                        <ArrowUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-3/4"/> : 
                            <div className="text-2xl font-bold" dir="ltr">{new Intl.NumberFormat('ar-SA').format(income)} <span className="saudi-riyal">&#xea;</span></div>
                        }
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي المصاريف</CardTitle>
                        <ArrowDown className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-3/4"/> : 
                            <div className="text-2xl font-bold" dir="ltr">{new Intl.NumberFormat('ar-SA').format(expenses)} <span className="saudi-riyal">&#xea;</span></div>
                        }
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
                        <span className={`h-4 w-4 ${netProfit >= 0 ? 'text-green-500' : 'text-destructive'}`}>{netProfit >= 0 ? '💰' : '💸'}</span>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-3/4"/> : 
                            <div className="text-2xl font-bold" dir="ltr">{new Intl.NumberFormat('ar-SA').format(netProfit)} <span className="saudi-riyal">&#xea;</span></div>
                        }
                    </CardContent>
                </Card>
            </div>
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>الوصف</TableHead>
                            <TableHead className="hidden sm:table-cell">النوع</TableHead>
                            <TableHead>المبلغ</TableHead>
                            <TableHead className="hidden md:table-cell">الفئة</TableHead>
                            <TableHead className="hidden md:table-cell">التاريخ</TableHead>
                            <TableHead><span className="sr-only">الإجراءات</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({length: 5}).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-48"/></TableCell>
                                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24"/></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24"/></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28"/></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8"/></TableCell>
                                </TableRow>
                            ))
                        ) : transactions.length > 0 ? (
                            transactions.map(t => (
                                <TableRow key={t.id}>
                                    <TableCell className="font-medium">{t.description}</TableCell>
                                    <TableCell className={`hidden sm:table-cell font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-destructive'}`}>
                                        {t.type === 'income' ? 'دخل' : 'مصروف'}
                                    </TableCell>
                                    <TableCell dir="ltr">{new Intl.NumberFormat('ar-SA').format(t.amount)} <span className="saudi-riyal">&#xea;</span></TableCell>
                                    <TableCell className="hidden md:table-cell">{t.category}</TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">{format(parseISO(t.date), "yyyy-MM-dd", { locale: ar })}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0" disabled={t.id.startsWith('inv_') || t.id.startsWith('sub_')}>
                                                    <MoreHorizontal className="h-4 w-4"/>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(t)}><Edit className="ml-2 h-4 w-4"/> تعديل</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(t)} className="text-destructive"><Trash2 className="ml-2 h-4 w-4"/> حذف</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">لا توجد معاملات مالية مسجلة.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {selectedTransaction && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <TransactionForm 
                        transaction={selectedTransaction}
                        onSave={() => {
                            fetchTransactions();
                            setIsDialogOpen(false);
                        }}
                        onClose={() => setIsDialogOpen(false)}
                    />
                </Dialog>
            )}
        </div>
    );
}
