
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from '@/lib/db';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, CheckCircle2, DollarSign, FileText, TrendingUp, TrendingDown, Clock, Pocket, Users, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, intervalToDuration } from 'date-fns';
import { ar } from "date-fns/locale";
import Link from 'next/link';

interface Project {
    id: string;
    name: string;
    description: string;
    budget: number;
    startDate: string;
    endDate: string;
    progress: number;
    clientName?: string;
}

interface Invoice {
    id: string;
    invoiceNumber: string;
    clientName: string;
    total: number;
    invoiceDate: string;
    status: "paid" | "unpaid" | "overdue";
}

interface Task {
    id: string;
    title: string;
    priority: 'high' | 'medium' | 'low';
    status: 'todo' | 'inprogress' | 'done';
}

interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
}

const priorityMap = {
    high: { label: "عالية", variant: "destructive" as const },
    medium: { label: "متوسطة", variant: "secondary" as const },
    low: { label: "منخفضة", variant: "outline" as const },
};

const statusMap = {
    todo: { label: "جديد" },
    inprogress: { label: "قيد التنفيذ" },
    done: { label: "مكتمل" },
};

const invoiceStatusMap = {
    paid: { label: "مدفوعة", variant: "secondary" as const, className: "bg-green-100 text-green-800 border-green-200" },
    unpaid: { label: "قائمة", variant: "secondary" as const, className: "" },
    overdue: { label: "متأخرة", variant: "destructive" as const, className: "" },
};

export default function ProjectDetailPage() {
    const params = useParams();
    const { id } = params;
    const { toast } = useToast();

    const [project, setProject] = useState<Project | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [expenses, setExpenses] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProjectData = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            // Fetch project details
            const projectDoc = await getDoc(doc(db, 'projects', id as string));
            if (!projectDoc.exists()) {
                toast({ variant: 'destructive', title: 'خطأ', description: 'المشروع غير موجود.' });
                return;
            }
            const projectData = { id: projectDoc.id, ...projectDoc.data() } as Project;
            setProject(projectData);

            // Fetch related invoices
            const invoicesQuery = query(collection(db, 'invoices'), where('projectId', '==', id));
            const invoicesSnapshot = await getDocs(invoicesQuery);
            const invoicesData = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
            setInvoices(invoicesData);

            // Fetch related tasks
            const tasksQuery = query(collection(db, 'tasks'), where('project', '==', projectData.name));
            const tasksSnapshot = await getDocs(tasksQuery);
            const tasksData = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
            setTasks(tasksData);
            
            // Fetch related expenses by searching project name in description
            const expensesQuery = query(collection(db, 'transactions'), where('type', '==', 'expense'));
            const expensesSnapshot = await getDocs(expensesQuery);
            const projectName = projectData.name;
            const expensesData = expensesSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Transaction))
                .filter(transaction => transaction.description.includes(projectName));
            setExpenses(expensesData);

        } catch (error) {
            console.error("Error fetching project data: ", error);
            toast({ variant: 'destructive', title: 'خطأ', description: 'لم نتمكن من جلب بيانات المشروع.' });
        } finally {
            setIsLoading(false);
        }
    }, [id, toast]);

    useEffect(() => {
        fetchProjectData();
    }, [fetchProjectData]);
    
    const { totalIncome, totalExpenses, netProfit, projectDuration } = React.useMemo(() => {
        const totalIncome = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
        const totalExpensesValue = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const netProfit = totalIncome - totalExpensesValue;
        
        let projectDuration = "غير محدد";
        if (project?.startDate && project.endDate) {
            const duration = intervalToDuration({
                start: parseISO(project.startDate),
                end: parseISO(project.endDate)
            });
            const parts = [];
            if(duration.months && duration.months > 0) parts.push(`${new Intl.NumberFormat('ar-SA').format(duration.months)} أشهر`);
            if(duration.days && duration.days > 0) parts.push(`${new Intl.NumberFormat('ar-SA').format(duration.days)} أيام`);
            projectDuration = parts.join(" و ") || "أقل من يوم";
        }

        return { totalIncome, totalExpenses: totalExpensesValue, netProfit, projectDuration };
    }, [invoices, expenses, project]);


    if (isLoading) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <Skeleton className="h-10 w-1/2" />
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                <div className="grid lg:grid-cols-2 gap-8">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 text-center">
                <p>لم يتم العثور على المشروع.</p>
                <Button asChild variant="link">
                    <Link href="/projects">
                        <ArrowRight className="ml-2 h-4 w-4" />
                        العودة للمشاريع
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 text-right">
            <PageHeader
                title={project.name}
                description={project.description || "نظرة عامة على تفاصيل المشروع."}
            >
                 <Button asChild variant="outline">
                    <Link href="/projects">
                        <ArrowRight className="ml-2 h-4 w-4" />
                        العودة للمشاريع
                    </Link>
                </Button>
            </PageHeader>
            <div className="space-y-8">
                 <section>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">إجمالي الدخل</CardTitle>
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold" dir="ltr">{new Intl.NumberFormat('ar-SA').format(totalIncome)} <span className="saudi-riyal">&#xea;</span></div>
                                <p className="text-xs text-muted-foreground">من الفواتير المدفوعة</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
                                <TrendingDown className="h-4 w-4 text-destructive" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold" dir="ltr">{new Intl.NumberFormat('ar-SA').format(totalExpenses)} <span className="saudi-riyal">&#xea;</span></div>
                                <p className="text-xs text-muted-foreground">التكاليف المرتبطة بالمشروع</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
                                <Pocket className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold" dir="ltr">{new Intl.NumberFormat('ar-SA').format(netProfit)} <span className="saudi-riyal">&#xea;</span></div>
                                <p className="text-xs text-muted-foreground">الدخل - المصاريف</p>
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">مدة المشروع</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{projectDuration}</div>
                                <p className="text-xs text-muted-foreground">من البداية إلى النهاية</p>
                            </CardContent>
                        </Card>
                        {project.clientName && (
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">العميل</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{project.clientName}</div>
                                    <p className="text-xs text-muted-foreground">العميل المسؤول عن المشروع</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </section>
                <div className="grid lg:grid-cols-2 gap-8">
                     <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5"/>
                                <CardTitle>الفواتير المرتبطة</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>رقم الفاتورة</TableHead>
                                       <TableHead>المبلغ</TableHead>
                                       <TableHead>الحالة</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {invoices.length > 0 ? invoices.map(inv => (
                                       <TableRow key={inv.id}>
                                           <TableCell className="font-medium hover:underline">
                                               <Link href={`/tools/invoice-generator?id=${inv.id}`}>{inv.invoiceNumber}</Link>
                                           </TableCell>
                                           <TableCell dir="ltr">{new Intl.NumberFormat('ar-SA').format(inv.total)} <span className="saudi-riyal">&#xea;</span></TableCell>
                                            <TableCell>
                                                <Badge variant={invoiceStatusMap[inv.status]?.variant} className={invoiceStatusMap[inv.status]?.className}>
                                                    {invoiceStatusMap[inv.status]?.label}
                                                </Badge>
                                            </TableCell>
                                       </TableRow>
                                   )) : (
                                       <TableRow>
                                           <TableCell colSpan={3} className="h-24 text-center">لا توجد فواتير مرتبطة بهذا المشروع.</TableCell>
                                       </TableRow>
                                   )}
                               </TableBody>
                           </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                             <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5"/>
                                <CardTitle>المهام المرتبطة</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>المهمة</TableHead>
                                       <TableHead>الأولوية</TableHead>
                                       <TableHead>الحالة</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {tasks.length > 0 ? tasks.map(task => (
                                       <TableRow key={task.id}>
                                           <TableCell className="font-medium">{task.title}</TableCell>
                                           <TableCell>
                                               <Badge variant={priorityMap[task.priority].variant}>
                                                   {priorityMap[task.priority].label}
                                               </Badge>
                                           </TableCell>
                                           <TableCell>{statusMap[task.status].label}</TableCell>
                                       </TableRow>
                                   )) : (
                                        <TableRow>
                                           <TableCell colSpan={3} className="h-24 text-center">لا توجد مهام مرتبطة بهذا المشروع.</TableCell>
                                       </TableRow>
                                   )}
                               </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
