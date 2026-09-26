
"use client";

import * as React from "react";
import { db } from "@/lib/db";
import { collection, getDocs, query, orderBy, Timestamp, deleteDoc, doc } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Link as LinkIcon, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

interface Ticket {
    id: string;
    ticketId: string;
    customerName: string;
    customerEmail: string;
    subject: string;
    status: 'new' | 'in-progress' | 'closed';
    updatedAt: Timestamp;
}

const statusMap = {
    new: { label: "جديدة", variant: "destructive" as const, className: "" },
    'in-progress': { label: "قيد المعالجة", variant: "secondary" as const, className: "bg-yellow-100 text-yellow-800" },
    closed: { label: "مغلقة", variant: "secondary" as const, className: "bg-green-100 text-green-800" },
};


const SupportPageContent = () => {
    const { toast } = useToast();
    const router = useRouter();
    const [tickets, setTickets] = React.useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isClient, setIsClient] = React.useState(false);
    const [filter, setFilter] = React.useState('all');
    const [submissionLink, setSubmissionLink] = React.useState("");

    React.useEffect(() => {
        setIsClient(true);
        setSubmissionLink(window.location.origin + "/support/submit");
    }, []);

    const fetchTickets = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, "support_tickets"), orderBy("updatedAt", "desc"));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
            setTickets(data);
        } catch (error) {
            toast({ variant: "destructive", title: "حدث خطأ أثناء جلب الطلبات." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);
    
    const filteredTickets = React.useMemo(() => {
        switch (filter) {
            case 'new':
                return tickets.filter(t => t.status === 'new');
            case 'in-progress':
                return tickets.filter(t => t.status === 'in-progress');
            case 'closed':
                return tickets.filter(t => t.status === 'closed');
            case 'all':
            default:
                return tickets.filter(t => t.status !== 'closed');
        }
    }, [tickets, filter]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(submissionLink);
        toast({ title: "تم نسخ رابط تقديم الطلبات بنجاح!" });
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 text-right">
            <PageHeader
                title="طلبات العملاء"
                description="إدارة جميع رسائل وطلبات الدعم الواردة من العملاء."
            >
                 <Button variant="outline" onClick={handleCopyLink} disabled={!submissionLink}>
                    <Copy className="ml-2 h-4 w-4"/>
                    نسخ رابط التقديم
                </Button>
            </PageHeader>
            
            <div className="mb-4">
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-full sm:w-[280px]">
                        <SelectValue placeholder="عرض حسب الحالة..."/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">كل التذاكر النشطة ({tickets.filter(t => t.status !== 'closed').length})</SelectItem>
                        <SelectItem value="new">الجديدة ({tickets.filter(t => t.status === 'new').length})</SelectItem>
                        <SelectItem value="in-progress">قيد المعالجة ({tickets.filter(t => t.status === 'in-progress').length})</SelectItem>
                        <SelectItem value="closed">الأرشيف ({tickets.filter(t => t.status === 'closed').length})</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>رقم الطلب</TableHead>
                            <TableHead>الموضوع</TableHead>
                            <TableHead className="hidden sm:table-cell">العميل</TableHead>
                            <TableHead>الحالة</TableHead>
                            <TableHead className="hidden sm:table-cell">آخر تحديث</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredTickets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    لا توجد طلبات في هذا القسم.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTickets.map(ticket => (
                                <TableRow key={ticket.id} className="cursor-pointer" onClick={() => router.push(`/support/${ticket.id}`)}>
                                    <TableCell className="font-mono">{ticket.ticketId}</TableCell>
                                    <TableCell className="font-medium max-w-xs truncate">{ticket.subject}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{ticket.customerName}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusMap[ticket.status].variant} className={cn(statusMap[ticket.status].className, "whitespace-nowrap")}>
                                            {statusMap[ticket.status].label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                                        {isClient ? formatDistanceToNow(ticket.updatedAt.toDate(), { addSuffix: true, locale: ar }) : '...'}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
};

export default function SupportPage() {
    const [isClient, setIsClient] = React.useState(false)
 
    React.useEffect(() => {
        setIsClient(true)
    }, [])

    return isClient ? <SupportPageContent /> : (
        <div className="p-4 sm:p-6 lg:p-8 text-right">
            <PageHeader
                title="طلبات العملاء"
                description="إدارة جميع رسائل وطلبات الدعم الواردة من العملاء."
            >
                <Skeleton className="h-10 w-40" />
            </PageHeader>
             <div className="mb-4">
                <Skeleton className="h-10 w-full sm:w-[280px]" />
            </div>
             <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>رقم الطلب</TableHead>
                            <TableHead>الموضوع</TableHead>
                            <TableHead className="hidden sm:table-cell">العميل</TableHead>
                            <TableHead>الحالة</TableHead>
                            <TableHead className="hidden sm:table-cell">آخر تحديث</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
