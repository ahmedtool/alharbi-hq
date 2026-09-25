
"use client";

import React from "react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import {
  CheckCircle2,
  Briefcase,
  Code,
  DollarSign,
  Lightbulb,
  Settings,
  FileText,
  Users,
  FileDigit,
  FileJson,
  Repeat,
  Package,
  Calculator,
  Star,
  TrendingUp,
  LifeBuoy,
  MessageCircle,
  TrendingDown,
  Wallet,
  Library,
  LogOut,
  RefreshCcw,
  Loader2,
  Link2,
  Hash,
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ClientNumberFormat } from "@/components/app/client-number-format";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { signOut } from "firebase/auth";

const navLinks = [
  {
    category: "الرئيسية",
    links: [
      { name: "المهام", href: "/tasks", icon: CheckCircle2 },
      { name: "المشاريع", href: "/projects", icon: Briefcase },
      { name: "العملاء", href: "/clients", icon: Users },
      { name: "ملفاتي", href: "/files", icon: FileText },
      { name: "الدعم الفني", href: "/support", icon: LifeBuoy },
      { name: "مركز الأفكار", href: "/ideas", icon: Lightbulb },
      { name: "المساعد الذكي", href: "/ai-assistant", icon: MessageCircle },
      { name: "صفحة الروابط (Bio)", href: "/bio", icon: Link2 },
    ]
  },
  {
    category: "مالية المشاريع",
    links: [
      { name: "نظرة عامة مالية", href: "/finance", icon: DollarSign },
      { name: "الفواتير", href: "/finance/invoices", icon: FileDigit },
      { name: "الاشتراكات", href: "/finance/subscriptions", icon: Repeat },
      { name: "المنتجات والخدمات", href: "/finance/products", icon: Package },
    ]
  },
  {
    category: "الأدوات والتطبيقات",
    links: [
        { name: "إدارة الروابط العامة", href: "/tools-directory", icon: Library },
        { name: "إدارة الوصول بالرقم", href: "/numbered-links", icon: Hash },
        { name: "اداة تسعير المنتجات", href: "/tools/pricing-calculator", icon: Calculator },
        { name: "اداة الفاتورة", href: "/tools/invoice-generator", icon: FileDigit },
        { name: "اداة بناء العقود", href: "/tools/contract-builder", icon: FileJson },
        { name: "تنبؤ المبيعات", href: "/tools/sales-forecasting", icon: TrendingUp },
        { name: "متتبع العادات", href: "/tools/habit-tracker", icon: Star },
    ]
  },
  {
      category: "المطور",
      links: [
        { name: "واجهات API والرموز", href: "/developer/api-tokens", icon: Code },
        { name: "الأكواد والأدوات", href: "/developer/snippets", icon: Code },
      ]
  },
  {
      category: "النظام",
      links: [
        { name: "الإعدادات", href: "/settings", icon: Settings },
      ]
  }
];

interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
}

interface Task {
    id: string;
    title: string;
    priority: 'high' | 'medium' | 'low';
}

interface Stats {
    projectsCount: number;
    openTicketsCount: number;
    latestTasks: Task[];
}


export default function DashboardPage() {
    const [transactions, setTransactions] = React.useState<Transaction[]>([]);
    const [stats, setStats] = React.useState<Stats>({ projectsCount: 0, openTicketsCount: 0, latestTasks: [] });
    const [isLoading, setIsLoading] = React.useState(true);
    const [isClearingCache, setIsClearingCache] = React.useState(false);
    const router = useRouter();
    const { toast } = useToast();


    React.useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                // Fetch transactions for financial stats
                const transactionsSnapshot = await getDocs(collection(db, "transactions"));
                const transactionsData = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
                setTransactions(transactionsData);

                // Fetch other stats
                const projectsSnapshot = await getDocs(collection(db, "projects"));
                
                const openTicketsQuery = query(collection(db, "support_tickets"), where("status", "!=", "closed"));
                const openTicketsSnapshot = await getDocs(openTicketsQuery);

                const tasksQuery = query(collection(db, "tasks"), where("status", "!=", "done"), orderBy("status"), limit(3));
                const tasksSnapshot = await getDocs(tasksQuery);
                const latestTasksData = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));

                setStats({
                    projectsCount: projectsSnapshot.size,
                    openTicketsCount: openTicketsSnapshot.size,
                    latestTasks: latestTasksData,
                });

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const { income, expenses, netProfit } = React.useMemo(() => {
        const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const netProfit = income - expenses;
        return { income, expenses, netProfit };
    }, [transactions]);
    
    const handleLogout = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('authenticatedUser');
            toast({ title: 'تم تسجيل الخروج بنجاح' });
            router.push('/admin');
        } catch (error) {
            console.error("Error signing out:", error);
            toast({ variant: 'destructive', title: 'حدث خطأ أثناء تسجيل الخروج' });
        }
    }

    const handleClearCache = async () => {
        if (!window.confirm("هل أنت متأكد أنك تريد مسح الكاش؟ سيتم تسجيل خروجك وإعادة تحميل التطبيق بالكامل.")) return;
        setIsClearingCache(true);
        toast({
            title: "جاري مسح الكاش...",
            description: "قد يستغرق هذا بضع ثوانٍ.",
        });

        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }
            if (window.caches) {
                const keys = await window.caches.keys();
                await Promise.all(keys.map(key => window.caches.delete(key)));
            }
            
            localStorage.clear();
            sessionStorage.clear();

            toast({
                title: "تم مسح الكاش بنجاح!",
                description: "جاري إعادة تحميل التطبيق...",
            });
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error("Error clearing cache:", error);
            toast({
                variant: "destructive",
                title: "فشل مسح الكاش",
                description: "حدث خطأ غير متوقع. حاول إعادة تحميل الصفحة يدويًا.",
            });
            setIsClearingCache(false);
        }
    };


  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader
        title="لوحة التحكم والتنقل"
        description="وصول سريع لجميع أقسام وأدوات تطبيقك."
      >
        <Button onClick={handleClearCache} variant="destructive" disabled={isClearingCache}>
            {isClearingCache ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <RefreshCcw className="ml-2 h-4 w-4"/>}
            مسح الكاش
        </Button>
        <Button onClick={handleLogout} variant="outline">
            <LogOut className="ml-2 h-4 w-4" />
            تسجيل الخروج
        </Button>
      </PageHeader>
      <main className="space-y-8">
        <section>
            <h2 className="text-2xl font-bold mb-4">نظرة عامة سريعة</h2>
             <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي الدخل</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-3/4"/> : 
                            <div className="text-2xl font-bold" dir="ltr"><ClientNumberFormat value={income} /> <span className="saudi-riyal">&#xea;</span></div>
                        }
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي المصاريف</CardTitle>
                        <TrendingDown className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-3/4"/> : 
                            <div className="text-2xl font-bold" dir="ltr"><ClientNumberFormat value={expenses} /> <span className="saudi-riyal">&#xea;</span></div>
                        }
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-3/4"/> : 
                            <div className="text-2xl font-bold" dir="ltr"><ClientNumberFormat value={netProfit} /> <span className="saudi-riyal">&#xea;</span></div>
                        }
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">مشاريع نشطة</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-3/4"/> : 
                            <div className="text-2xl font-bold"><ClientNumberFormat value={stats.projectsCount} /></div>
                        }
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">طلبات دعم مفتوحة</CardTitle>
                        <LifeBuoy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-3/4"/> : 
                            <div className="text-2xl font-bold"><ClientNumberFormat value={stats.openTicketsCount} /></div>
                        }
                    </CardContent>
                </Card>
                <Card className="col-span-2 lg:col-span-3">
                     <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">آخر المهام المفتوحة</CardTitle>
                    </CardHeader>
                    <CardContent>
                         {isLoading ? <Skeleton className="h-12 w-full"/> : (
                             stats.latestTasks.length > 0 ? (
                                <div className="space-y-2">
                                {stats.latestTasks.map(task => (
                                    <div key={task.id} className="flex justify-between items-center text-sm">
                                        <p>{task.title}</p>
                                        <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                                            {task.priority === 'high' ? 'عالية' : (task.priority === 'medium' ? 'متوسطة' : 'منخفضة')}
                                        </Badge>
                                    </div>
                                ))}
                                </div>
                             ) : (
                                <p className="text-sm text-muted-foreground text-center py-2">لا توجد مهام مفتوحة حاليًا. 🎉</p>
                             )
                         )}
                    </CardContent>
                </Card>
            </div>
        </section>

        {navLinks.map((section) => {
            return(
          <div key={section.category}>
            <h2 className="text-2xl font-bold mb-4">{section.category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {section.links.map((link) => {
                const Icon = link.icon;
                return (
                <Link href={link.href} key={link.name} className="block h-full">
                  <Card className="hover:bg-accent/50 hover:border-primary/20 transition-colors h-full">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-3 h-full">
                      <Icon className="h-8 w-8 text-primary" />
                      <p className="text-base font-semibold">{link.name}</p>
                    </CardContent>
                  </Card>
                </Link>
              )})}
            </div>
          </div>
        )})}
      </main>
    </div>
  );
}
