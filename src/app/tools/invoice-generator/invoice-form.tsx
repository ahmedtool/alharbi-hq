
"use client";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Trash2, Download, Save, Loader2, Check, ChevronsUpDown } from "lucide-react";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { collection, doc, getDoc, setDoc, getDocs, query, orderBy, limit, deleteDoc, where, addDoc, serverTimestamp } from "@/lib/db";
import { ref, uploadBytes, getDownloadURL } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Card, CardContent } from "@/components/ui/card";
import { logoAt } from "@/lib/brand";
import { ar } from "date-fns/locale";
import { format } from "date-fns";


interface LineItem {
  id: number;
  description: string;
  quantity: number;
  price: number;
}

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
}

interface Client {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    notes: string;
}

interface Project {
    id: string;
    name: string;
}

const generateInvoiceNumber = async () => {
    const q = query(collection(db, "invoices"), orderBy("invoiceNumber", "desc"), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return "INV-001";
    }
    const lastInvoice = querySnapshot.docs[0].data();
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1], 10);
    const newNumber = (lastNumber + 1).toString().padStart(3, '0');
    return `INV-${newNumber}`;
}


export function InvoiceForm() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('id');
  const invoiceSheetRef = useRef<HTMLDivElement>(null);

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: 1, description: "", quantity: 1, price: 0 },
  ]);
  
  const [yourDetails, setYourDetails] = useState("أحمد الحربي\nالمطوّر\nالرياض، المملكة العربية السعودية\nhi@ahmedalharbi.com");
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");


  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState("شكرًا لتعاملكم معنا.");

  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInitialData = useCallback(async () => {
    try {
        const productsSnapshot = await getDocs(collection(db, "products"));
        setProducts(productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));

        const clientsSnapshot = await getDocs(collection(db, "clients"));
        setClients(clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));

        const projectsSnapshot = await getDocs(collection(db, "projects"));
        setProjects(projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    } catch (error) {
        console.error("Error fetching initial data:", error);
        toast({ variant: "destructive", title: "خطأ في جلب البيانات الأولية." });
    }
  }, [toast]);

  const fetchInvoice = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
        const docRef = doc(db, "invoices", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            setInvoiceNumber(data.invoiceNumber);
            setInvoiceDate(data.invoiceDate);
            setDueDate(data.dueDate);
            setYourDetails(data.yourDetails);
            setClientName(data.clientName);
            setClientCompany(data.clientCompany || "");
            setLineItems(data.lineItems);
            setNotes(data.notes);
            setProjectId(data.projectId);
            setProjectName(data.projectName || '');
        } else {
            toast({ variant: "destructive", title: "الفاتورة غير موجودة." });
        }
    } catch (error) {
        toast({ variant: "destructive", title: "خطأ في جلب الفاتورة." });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const initialize = async () => {
        setIsLoading(true);
        await fetchInitialData();

        if (invoiceId) {
            await fetchInvoice(invoiceId);
        } else {
            const newInvNumber = await generateInvoiceNumber();
            setInvoiceNumber(newInvNumber);
            setIsLoading(false);
        }
    };
    initialize();
  }, [fetchInitialData, fetchInvoice, invoiceId]);


  const handleAddItem = () => {
    setLineItems([...lineItems, { id: Date.now(), description: "", quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (id: number) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const handleItemChange = (id: number, field: keyof Omit<LineItem, 'id'>, value: string | number) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };
  
  const handleProductSelect = (id: number, product: Product) => {
    setLineItems(lineItems.map(item =>
        item.id === id ? { ...item, description: `${product.name}\n${product.description}`, price: product.price, quantity: 1 } : item
    ));
  };

  const handleClientSelect = (client: Client) => {
      setClientName(client.name);
      setClientCompany(client.company || "");
  }
  
  const handleProjectSelect = (project: Project) => {
      setProjectId(project.id);
      setProjectName(project.name);
  }
  
  const { subtotal, total } = useMemo(() => {
      const subtotal = lineItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price)), 0);
      const total = subtotal;
      return { subtotal, total };
  }, [lineItems]);

    const handleGeneratePdf = async () => {
        const input = invoiceSheetRef.current;
        if (!input) {
            toast({ variant: "destructive", title: "خطأ", description: "لم يتم العثور على عنصر الفاتورة." });
            return null;
        }

        try {
            const textareas = input.querySelectorAll('textarea');
            textareas.forEach(ta => ta.style.height = `${ta.scrollHeight}px`);

            const canvas = await html2canvas(input, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                // Always A4-like width, even when saved from a phone.
                windowWidth: 1024,
                width: 820,
                // html2canvas draws letter-by-letter when letter-spacing is set,
                // which breaks Arabic joining — reset it in the cloned page.
                onclone: (docClone, el) => {
                    el.style.width = '820px';
                    el.style.maxWidth = '820px';
                    const st = docClone.createElement('style');
                    st.textContent = '* { letter-spacing: normal !important; } #invoice-sheet { border: 0 !important; box-shadow: none !important; }';
                    docClone.head.appendChild(st);
                },
            });

            textareas.forEach(ta => ta.style.height = '');

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const contentWidth = pdfWidth - margin * 2;
            const pageContentHeight = pdfHeight - margin * 2;
            // Slice the tall canvas into A4 pages instead of shrinking it onto one.
            const pxPerMm = canvas.width / contentWidth;
            const slicePx = Math.floor(pageContentHeight * pxPerMm);
            for (let y = 0, page = 0; y < canvas.height; y += slicePx, page++) {
                const h = Math.min(slicePx, canvas.height - y);
                const part = document.createElement('canvas');
                part.width = canvas.width;
                part.height = h;
                part.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
                if (page > 0) pdf.addPage();
                pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, contentWidth, h / pxPerMm);
            }
            return pdf.output('blob');

        } catch (error) {
            console.error("Error generating PDF", error);
            toast({ variant: "destructive", title: "خطأ في إنشاء PDF" });
            return null;
        }
    };


  const handleSaveInvoice = async () => {
    setIsSaving(true);
    const idToSave = invoiceId || doc(collection(db, "invoices")).id;

    try {
        const existingDoc = invoiceId ? await getDoc(doc(db, "invoices", invoiceId)) : null;

        const invoiceData = {
            invoiceNumber,
            invoiceDate,
            dueDate,
            yourDetails,
            clientName,
            clientCompany,
            lineItems,
            subtotal,
            total,
            notes,
            projectId: projectId || null,
            projectName: projects.find(p => p.id === projectId)?.name || projectName,
            status: existingDoc?.data()?.status || 'unpaid',
            paymentMethod: existingDoc?.data()?.paymentMethod || 'تحويل بنكي',
            internalNotes: existingDoc?.data()?.internalNotes || '',
        };
        
        await setDoc(doc(db, "invoices", idToSave), invoiceData);
        
        toast({ title: "تم حفظ الفاتورة بنجاح!", description: `رقم الفاتورة: ${invoiceNumber}` });

        const pdfBlob = await handleGeneratePdf();
        if (pdfBlob) {
            toast({ title: "جاري إنشاء وأرشفة نسخة PDF..." });
            const foldersQuery = query(collection(db, 'folders'), where('name', '==', 'الفواتير'), limit(1));
            const folderSnapshot = await getDocs(foldersQuery);
            let folderId;

            if(folderSnapshot.empty) {
                const newFolderDoc = await addDoc(collection(db, 'folders'), {
                    name: 'الفواتير',
                    parentId: 'root',
                    createdAt: serverTimestamp()
                });
                folderId = newFolderDoc.id;
            } else {
                folderId = folderSnapshot.docs[0].id;
            }

            const fileName = `فاتورة-${invoiceNumber}.pdf`;
            const storagePath = `files/${folderId}/${fileName}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, pdfBlob);
            const downloadURL = await getDownloadURL(storageRef);

            await addDoc(collection(db, "files"), {
                name: fileName,
                url: downloadURL,
                path: storagePath,
                size: pdfBlob.size,
                parentId: folderId,
                createdAt: serverTimestamp(),
            });

             toast({ title: "تم أرشفة الفاتورة كـ PDF بنجاح." });
        }

        const transactionId = `inv_${idToSave}`;
        const transactionRef = doc(db, "transactions", transactionId);

        if (invoiceData.status === 'paid') {
            await setDoc(transactionRef, {
                id: transactionId,
                description: `دخل من الفاتورة #${invoiceData.invoiceNumber}`,
                amount: invoiceData.total,
                type: 'income',
                category: 'دخل فواتير',
                date: new Date().toISOString()
            });
        } else {
             if ((await getDoc(transactionRef)).exists()) {
                await deleteDoc(transactionRef);
            }
        }
        
    } catch(error) {
        console.error("Error saving invoice", error);
        toast({ variant: "destructive", title: "خطأ", description: "لم نتمكن من حفظ الفاتورة." });
    } finally {
        setIsSaving(false);
    }
  }
  
    const handlePrint = () => {
        const old = document.title;
        document.title = `فاتورة ${invoiceNumber}${clientCompany || clientName ? ` - ${clientCompany || clientName}` : ""}`;
        window.print();
        document.title = old;
    }


  if(isLoading) {
      return (
          <div className="flex justify-center items-center h-[80vh]">
              <Loader2 className="h-10 w-10 animate-spin" />
          </div>
      )
  }

  return (
    <>
      <div className="no-print p-4 sm:p-6 lg:p-8 text-right print:hidden">
        <PageHeader
          title={invoiceId ? `تعديل فاتورة ${invoiceNumber}` : "اداة الفاتورة"}
          description="أنشئ فواتير احترافية وأرسلها لعملائك بسهولة."
        >
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={handleSaveInvoice} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <Save className="ml-2 h-4 w-4" />}
                {isSaving ? "جاري الحفظ..." : "حفظ وأرشفة الفاتورة"}
                </Button>
                <Button onClick={handlePrint} className="w-full">
                    <Download className="ml-2 h-4 w-4" />
                    تحميل PDF
                </Button>
            </div>
        </PageHeader>
      </div>
      
      <main className="contract-page bg-muted/30 p-4 sm:p-6 lg:p-10 print:p-0">
          <div className="max-w-4xl mx-auto grid gap-6 print:block">
            {/* Form Section */}
            <Card className="print:hidden">
                <CardContent className="p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <Label className="font-bold">تفاصيل المرسل</Label>
                            <Textarea value={yourDetails} onChange={e => setYourDetails(e.target.value)} rows={4} className="mt-1" />
                        </div>
                        <div>
                            <Label className="font-bold">معلومات الفاتورة</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                                <div className="space-y-1 sm:col-span-2">
                                    <Label htmlFor="inv-number" className="text-xs text-muted-foreground">رقم الفاتورة</Label>
                                    <Input id="inv-number" dir="ltr" className="text-right" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-001" />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="inv-date" className="text-xs text-muted-foreground">تاريخ الإصدار</Label>
                                    <Input id="inv-date" type="date" dir="ltr" className="text-right" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="inv-due" className="text-xs text-muted-foreground">تاريخ الاستحقاق</Label>
                                    <Input id="inv-due" type="date" dir="ltr" className="text-right" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                </div>
                            </div>
                        </div>
                         <div>
                            <Label className="font-bold">العميل</Label>
                            <ClientCombobox clients={clients} onSelect={handleClientSelect} selectedClientName={clientName} />
                            <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="اسم العميل" className="mt-1"/>
                            <Input value={clientCompany} onChange={e => setClientCompany(e.target.value)} placeholder="الشركة (اختياري)" className="mt-1"/>
                        </div>
                        <div>
                           <Label className="font-bold">المشروع</Label>
                           <ProjectCombobox projects={projects} onSelect={handleProjectSelect} selectedProjectName={projectName} />
                           <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="اسم المشروع (اختياري)" className="mt-1"/>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="print:hidden">
                <CardContent className="p-6">
                   <Label className="font-bold mb-4 block">بنود الفاتورة</Label>
                     {/* عناوين الأعمدة (تختفي في الجوال لأن كل حقل له عنوانه) */}
                     <div className="hidden md:grid md:grid-cols-12 gap-2 pb-2 mb-2 border-b text-xs font-semibold text-muted-foreground">
                        <span className="md:col-span-6">الوصف</span>
                        <span className="md:col-span-2 text-center">الكمية</span>
                        <span className="md:col-span-2 text-center">سعر الوحدة</span>
                        <span className="md:col-span-1 text-center">الإجمالي</span>
                        <span className="md:col-span-1" />
                     </div>
                     <div className="space-y-4">
                        {lineItems.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                                <div className="col-span-12 md:col-span-6">
                                    <Label className="text-xs md:hidden mb-1 block">الوصف</Label>
                                    <ProductCombobox
                                        products={products}
                                        onProductSelect={(product) => handleProductSelect(item.id, product)}
                                        onManualChange={(value) => handleItemChange(item.id, 'description', value)}
                                        value={item.description}
                                    />
                                </div>
                                <div className="col-span-4 md:col-span-2">
                                     <Label className="text-xs md:hidden mb-1 block">الكمية</Label>
                                     <Input type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', Number(e.target.value))} className="text-center" placeholder="الكمية" />
                                </div>
                                <div className="col-span-4 md:col-span-2">
                                     <Label className="text-xs md:hidden mb-1 block">سعر الوحدة</Label>
                                     <Input type="number" value={item.price} onChange={e => handleItemChange(item.id, 'price', Number(e.target.value))} className="text-center" placeholder="السعر" />
                                </div>
                                <p className="col-span-3 md:col-span-1 text-center font-semibold self-center pt-7 md:pt-0 whitespace-nowrap">{new Intl.NumberFormat('ar-SA').format(item.quantity * item.price)} <span className="saudi-riyal">&#xea;</span></p>
                                <Button variant="ghost" size="icon" className="col-span-1 self-center text-muted-foreground hover:text-destructive" onClick={() => handleRemoveItem(item.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                {index < lineItems.length - 1 && <Separator className="col-span-12 mt-2" />}
                            </div>
                        ))}
                    </div>
                     <Button variant="outline" size="sm" onClick={handleAddItem} className="mt-4">
                        <PlusCircle className="ml-2 h-4 w-4" />
                        إضافة بند جديد
                    </Button>
                </CardContent>
            </Card>

            {/* PDF Output Section */}
            <InvoiceSheet
              sheetRef={invoiceSheetRef}
              invoiceNumber={invoiceNumber}
              invoiceDate={invoiceDate}
              dueDate={dueDate}
              yourDetails={yourDetails}
              clientName={clientName}
              clientCompany={clientCompany}
              projectName={projectName}
              lineItems={lineItems}
              total={total}
              notes={notes}
            />
          </div>
      </main>
    </>
  );
}

const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : format(d, "d MMMM yyyy", { locale: ar });
};
const num = (x: number) => new Intl.NumberFormat('ar-SA').format(x || 0);

/** The printable invoice: fixed light colours so it looks the same in dark mode and in the PDF. */
function InvoiceSheet({ sheetRef, invoiceNumber, invoiceDate, dueDate, yourDetails, clientName, clientCompany, projectName, lineItems, total, notes }: {
    sheetRef: React.RefObject<HTMLDivElement>;
    invoiceNumber: string; invoiceDate: string; dueDate: string; yourDetails: string;
    clientName: string; clientCompany: string; projectName: string;
    lineItems: LineItem[]; total: number; notes: string;
}) {
    const [providerName, providerTitle, ...providerRest] = yourDetails.split('\n');
    const items = lineItems.filter(i => i.description.trim() || i.price);
    return (
        <div ref={sheetRef} id="invoice-sheet" dir="rtl" className="contract-sheet mx-auto w-full max-w-[820px] rounded-2xl border bg-white p-8 text-[13px] leading-[1.9] text-neutral-900 shadow-xl sm:p-12">
            <header className="flex items-start justify-between gap-6 border-b-2 border-neutral-900 pb-5">
                <div className="flex items-center gap-3">
                    <img src={logoAt(96)} alt="" width={52} height={52} crossOrigin="anonymous" onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-[52px] w-[52px] rounded-xl object-cover" />
                    <div>
                        <p className="text-lg font-bold leading-tight">{providerName || "أحمد الحربي"}</p>
                        <p className="text-xs text-neutral-500">{providerTitle || "المطوّر"}</p>
                    </div>
                </div>
                <div className="text-left">
                    <p className="text-2xl font-bold leading-tight">فاتورة</p>
                    <p className="text-xs text-neutral-500" dir="ltr">{invoiceNumber}</p>
                </div>
            </header>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="mb-1 text-xs font-bold text-neutral-500">من</p>
                    <p className="font-bold">{providerName || "أحمد الحربي"}</p>
                    {providerRest.filter(Boolean).map((l, i) => <p key={i} className="text-xs text-neutral-600">{l}</p>)}
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="mb-1 text-xs font-bold text-neutral-500">إلى</p>
                    <p className="font-bold">{clientCompany || clientName || "—"}</p>
                    {clientCompany && clientName && <p className="text-xs text-neutral-600">{clientName}</p>}
                    {projectName && <p className="text-xs text-neutral-600">المشروع: {projectName}</p>}
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs">
                    <div className="flex justify-between gap-2"><span className="text-neutral-500">تاريخ الإصدار</span><b>{fmtDate(invoiceDate)}</b></div>
                    <div className="mt-1 flex justify-between gap-2"><span className="text-neutral-500">تاريخ الاستحقاق</span><b>{fmtDate(dueDate)}</b></div>
                    <div className="mt-1 flex justify-between gap-2"><span className="text-neutral-500">رقم الفاتورة</span><b dir="ltr">{invoiceNumber}</b></div>
                </div>
            </div>

            <table className="mt-6 w-full border-collapse text-right">
                <thead>
                    <tr className="bg-neutral-900 text-white">
                        <th className="rounded-r-lg px-3 py-2 text-xs font-bold">#</th>
                        <th className="w-1/2 px-3 py-2 text-xs font-bold">الخدمة / المنتج</th>
                        <th className="px-3 py-2 text-center text-xs font-bold">الكمية</th>
                        <th className="px-3 py-2 text-center text-xs font-bold">سعر الوحدة</th>
                        <th className="rounded-l-lg px-3 py-2 text-left text-xs font-bold">الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    {(items.length ? items : lineItems).map((item, i) => (
                        <tr key={item.id} className="border-b border-neutral-200 align-top">
                            <td className="px-3 py-2.5 text-neutral-500">{num(i + 1)}</td>
                            <td className="whitespace-pre-wrap px-3 py-2.5 font-medium">{item.description || "—"}</td>
                            <td className="px-3 py-2.5 text-center">{num(item.quantity)}</td>
                            <td className="px-3 py-2.5 text-center">{num(item.price)}</td>
                            <td className="px-3 py-2.5 text-left font-semibold">{num(item.quantity * item.price)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-6 grid items-start gap-6 sm:grid-cols-2">
                <div>
                    {notes && (<>
                        <p className="mb-1 text-xs font-bold text-neutral-500">ملاحظات</p>
                        <p className="whitespace-pre-wrap text-neutral-700">{notes}</p>
                    </>)}
                </div>
                <div className="sign-block rounded-xl border-2 border-neutral-900 p-4">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                        <span>عدد البنود</span><span>{num(items.length)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2">
                        <span className="font-bold">الإجمالي المستحق</span>
                        <span className="text-xl font-bold">{num(total)} <span className="text-sm">ريال</span></span>
                    </div>
                </div>
            </div>

            <footer className="mt-10 border-t border-neutral-200 pt-4 text-center text-[11px] text-neutral-500">
                في حال وجود أي استفسار بخصوص هذه الفاتورة، يرجى التواصل معنا · ahmedalharbi.com
            </footer>
        </div>
    );
}

const ProductCombobox = ({
    products,
    value,
    onProductSelect,
    onManualChange
} : {
    products: Product[],
    value: string,
    onProductSelect: (product: Product) => void,
    onManualChange: (value: string) => void
}) => {
    const [open, setOpen] = React.useState(false);

    const handleSelect = (product: Product) => {
        onProductSelect(product);
        setOpen(false);
    };
    
    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        onManualChange(event.target.value);
        if (!open) {
            setOpen(true);
        }
    };
    
    const filteredProducts = products.filter(product => 
        value && product.name.toLowerCase().includes(value.toLowerCase())
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                 <Textarea
                    value={value}
                    onChange={handleInputChange}
                    onFocus={() => setOpen(true)}
                    placeholder="اختر أو أدخل وصف المنتج..."
                    className="w-full"
                    rows={value.split('\n').length || 1}
                />
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandList>
                        <CommandEmpty>لا يوجد منتج بهذا الاسم. يمكنك إضافته يدويًا.</CommandEmpty>
                        <CommandGroup>
                            {products.map((product) => (
                                <CommandItem
                                    key={product.id}
                                    value={product.name}
                                    onSelect={() => handleSelect(product)}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", value.startsWith(product.name) ? "opacity-100" : "opacity-0")}/>
                                    {product.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

const ClientCombobox = ({ clients, onSelect, selectedClientName }: { clients: Client[], onSelect: (client: Client) => void, selectedClientName: string }) => {
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState("");

     React.useEffect(() => {
        const client = clients.find(c => c.name === selectedClientName);
        if(client) {
            setValue(client.name.toLowerCase());
        } else {
            setValue("");
        }
    }, [selectedClientName, clients]);


    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                    {value ? clients.find((c) => c.name.toLowerCase() === value)?.name : "اختر من قائمة العملاء..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="ابحث عن عميل..." />
                    <CommandEmpty>لا يوجد عميل بهذا الاسم.</CommandEmpty>
                    <CommandList>
                        <CommandGroup>
                            {clients.map((client) => (
                                <CommandItem
                                    key={client.id}
                                    value={client.name.toLowerCase()}
                                    onSelect={(currentValue) => {
                                        setValue(currentValue);
                                        onSelect(client);
                                        setOpen(false);
                                    }}
                                >
                                     <Check className={cn("mr-2 h-4 w-4", value === client.name.toLowerCase() ? "opacity-100" : "opacity-0")}/>
                                    {client.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

const ProjectCombobox = ({ projects, onSelect, selectedProjectName }: { projects: Project[], onSelect: (project: Project) => void, selectedProjectName: string }) => {
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState("");

     React.useEffect(() => {
        const project = projects.find(p => p.name === selectedProjectName);
        if(project) {
            setValue(project.name.toLowerCase());
        } else {
             setValue("");
        }
    }, [selectedProjectName, projects]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                    {value ? projects.find((p) => p.name.toLowerCase() === value)?.name : "اختر من قائمة المشاريع..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="ابحث عن مشروع..." />
                    <CommandEmpty>لا يوجد مشروع بهذا الاسم.</CommandEmpty>
                    <CommandList>
                        <CommandGroup>
                            {projects.map((project) => (
                                <CommandItem
                                    key={project.id}
                                    value={project.name.toLowerCase()}
                                    onSelect={(currentValue) => {
                                        setValue(currentValue);
                                        onSelect(project);
                                        setOpen(false);
                                    }}
                                >
                                     <Check className={cn("mr-2 h-4 w-4", value === project.name.toLowerCase() ? "opacity-100" : "opacity-0")}/>
                                    {project.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
