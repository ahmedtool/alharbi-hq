
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from 'react';
import { cn } from "@/lib/utils";
import Image from 'next/image';
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  LayoutDashboard,
  BarChart3,
  CheckCircle2,
  Briefcase,
  Code,
  DollarSign,
  Lightbulb,
  Settings,
  ChevronLeft,
  FileText,
  Users,
  Hammer,
  FileDigit,
  FileJson,
  LogOut,
  MessageCircle,
  Repeat,
  Package,
  Calculator,
  LifeBuoy,
  TrendingUp,
  Star,
  Library,
  Link2,
  Hash,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";
import { doc, getDoc, collection, query, where, onSnapshot } from "@/lib/db";
import { auth, signOut } from "@/lib/auth";


export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [devMenuOpen, setDevMenuOpen] = React.useState(pathname.startsWith('/developer'));
  const [toolsMenuOpen, setToolsMenuOpen] = React.useState(pathname.startsWith('/tools') || pathname.startsWith('/tools-directory'));
  const [financeMenuOpen, setFinanceMenuOpen] = React.useState(pathname.startsWith('/finance'));
  const [logoUrl, setLogoUrl] = React.useState("https://res.cloudinary.com/dw5sydtj6/image/upload/v1755563838/%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_imqtxp.png");
  const [newTicketsCount, setNewTicketsCount] = React.useState(0);


  React.useEffect(() => {
    const fetchLogo = async () => {
        try {
            const docRef = doc(db, "app_config", "branding");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().logoUrl) {
                setLogoUrl(docSnap.data().logoUrl);
            }
        } catch (error) {
            console.error("Error fetching logo for sidebar:", error);
        }
    };
    fetchLogo();

    // Listen for new support tickets in real-time
    const q = query(collection(db, "support_tickets"), where("status", "==", "new"));
    const unsubscribeTickets = onSnapshot(q, (querySnapshot) => {
        setNewTicketsCount(querySnapshot.size);
    }, (error) => {
        console.error("Error fetching new tickets count:", error);
    });

    // Cleanup listeners on unmount
    return () => {
        unsubscribeTickets();
    }
  }, []);

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) return pathname === path;
    if(path === '/dashboard') return pathname === '/dashboard';
    if (path === '/tools' && (pathname.startsWith('/tools-directory'))) return true;
    return pathname.startsWith(path);
  };
  
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


  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sidebar-primary">
                <Image src={logoUrl} alt="Logo" width={24} height={24} className="text-sidebar-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold font-headline group-data-[collapsible=icon]:hidden">أحمد الحربي</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/dashboard", true)}>
              <Link href="/dashboard" prefetch={true}>
                <LayoutDashboard />
                <span>لوحة التحكم</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/tasks")}>
              <Link href="/tasks" prefetch={true}>
                <CheckCircle2 />
                <span>المهام</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/projects")}>
              <Link href="/projects" prefetch={true}>
                <Briefcase />
                <span>المشاريع</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/clients")}>
              <Link href="/clients" prefetch={true}>
                <Users />
                <span>العملاء</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/files")}>
              <Link href="/files" prefetch={true}>
                <FileText />
                <span>ملفاتي</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/support")}>
              <Link href="/support" prefetch={true}>
                <LifeBuoy />
                <span>الدعم الفني</span>
                {newTicketsCount > 0 && (
                    <SidebarMenuBadge>{newTicketsCount}</SidebarMenuBadge>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <Collapsible asChild open={financeMenuOpen} onOpenChange={setFinanceMenuOpen}>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                  <SidebarMenuButton isActive={isActive('/finance')} className="justify-between">
                    <div className="flex items-center gap-2">
                        <DollarSign />
                        <span>مالية المشاريع</span>
                    </div>
                    <ChevronLeft className={cn("h-4 w-4 transition-transform duration-200", financeMenuOpen && "rotate-[-90deg]")} />
                  </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                  <SidebarMenuSub>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/finance', true)}>
                              <Link href="/finance" prefetch={true}>نظرة عامة</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                       <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/finance/invoices')}>
                              <Link href="/finance/invoices" prefetch={true}><FileDigit className="w-4 h-4" /> الفواتير</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/finance/subscriptions')}>
                              <Link href="/finance/subscriptions" prefetch={true}><Repeat className="w-4 h-4" /> الاشتراكات</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                       <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/finance/products')}>
                              <Link href="/finance/products" prefetch={true}><Package className="w-4 h-4" /> المنتجات والخدمات</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/finance/reports')}>
                              <Link href="/finance/reports" prefetch={true}><BarChart3 className="w-4 h-4" /> التقارير</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                  </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>

          <Collapsible asChild open={toolsMenuOpen} onOpenChange={setToolsMenuOpen}>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                  <SidebarMenuButton isActive={isActive('/tools')} className="justify-between">
                    <div className="flex items-center gap-2">
                        <Hammer />
                        <span>ادوات أحمد</span>
                    </div>
                    <ChevronLeft className={cn("h-4 w-4 transition-transform duration-200", toolsMenuOpen && "rotate-[-90deg]")} />
                  </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                  <SidebarMenuSub>
                       <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/tools-directory')}>
                              <Link href="/tools-directory" prefetch={true}><Library /> مكتبة الأدوات</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/tools/pricing-calculator')}>
                              <Link href="/tools/pricing-calculator" prefetch={true}><Calculator /> اداة تسعير المنتجات</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/tools/invoice-generator')}>
                              <Link href="/tools/invoice-generator" prefetch={true}><FileDigit /> إنشاء فاتورة</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/tools/quote-builder')}>
                              <Link href="/tools/quote-builder" prefetch={true}><FileText /> عروض الأسعار</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/tools/contract-builder')}>
                              <Link href="/tools/contract-builder" prefetch={true}><FileJson /> اداة بناء العقود</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                       <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/tools/sales-forecasting')}>
                              <Link href="/tools/sales-forecasting" prefetch={true}><TrendingUp /> تنبؤ المبيعات</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                       <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/tools/habit-tracker')}>
                              <Link href="/tools/habit-tracker" prefetch={true}><Star /> متتبع العادات</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                  </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
          <Collapsible asChild open={devMenuOpen} onOpenChange={setDevMenuOpen}>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                  <SidebarMenuButton isActive={isActive('/developer')} className="justify-between">
                    <div className="flex items-center gap-2">
                        <Code />
                        <span>المطور</span>
                    </div>
                    <ChevronLeft className={cn("h-4 w-4 transition-transform duration-200", devMenuOpen && "rotate-[-90deg]")} />
                  </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                  <SidebarMenuSub>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/developer/api-tokens')}>
                              <Link href="/developer/api-tokens" prefetch={true}>واجهات API والرموز</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={isActive('/developer/snippets')}>
                              <Link href="/developer/snippets" prefetch={true}>الأكواد والأدوات</Link>
                          </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                  </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/ideas")}>
              <Link href="/ideas" prefetch={true}>
                <Lightbulb />
                <span>مركز الأفكار</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
         <SidebarMenu>
            <SidebarMenuItem>
                 <SidebarMenuButton asChild isActive={isActive("/ai-assistant")}>
                    <Link href="/ai-assistant" prefetch={true}>
                        <MessageCircle />
                        <span>المساعد الذكي</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/settings")}>
                <Link href="/settings" prefetch={true}>
                    <Settings />
                    <span>الإعدادات</span>
                </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                    <LogOut />
                    <span>تسجيل الخروج</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
