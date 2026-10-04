import {
  CheckCircle2, Briefcase, Code, DollarSign, Lightbulb, Settings, FileText, Users, FileDigit,
  FileJson, Repeat, Package, Calculator, Star, TrendingUp, LifeBuoy, MessageCircle, Library,
  Link2, Hash, LayoutGrid, Send,
} from "lucide-react";

/** Every dashboard section, grouped as on the dashboard page and in the mobile "more" sheet. */
export const navLinks = [
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
      { name: "صفحة طلب المشروع", href: "/request-preview", icon: Send },
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
        { name: "اداة تسعير المنتجات", href: "/tools/pricing-calculator", icon: Calculator },
        { name: "إنشاء فاتورة", href: "/tools/invoice-generator", icon: FileDigit },
        { name: "عروض الأسعار", href: "/tools/quote-builder", icon: FileText },
        { name: "العقود", href: "/tools/contract-builder", icon: FileJson },
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

/** The four tabs of the mobile bottom bar; everything else sits under "المزيد". */
export const mobileTabs = [
  { name: "الرئيسية", href: "/dashboard", icon: LayoutGrid },
  { name: "المهام", href: "/tasks", icon: CheckCircle2 },
  { name: "المالية", href: "/finance", icon: DollarSign },
  { name: "العملاء", href: "/clients", icon: Users },
];
