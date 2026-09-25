
"use client";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Trash2, Printer, Save, Loader2, Check, ChevronsUpDown } from "lucide-react";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, doc, getDoc, setDoc, getDocs, query, orderBy, limit, deleteDoc, where, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Card, CardContent } from "@/components/ui/card";
import { AmiriFont } from '@/lib/fonts/amiri-font';
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
  
  const [yourDetails, setYourDetails] = useState("أحمد الحربي\nمطور ويب مستقل\nالرياض، المملكة العربية السعودية\nhi@ahmedalharbi.com");
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

    const b64Decode = (str: string) => {
        if (typeof window !== 'undefined') {
            // Remove non-base64 characters
            const cleanStr = str.replace(/[^A-Za-z0-9+/=]/g, '');
            return window.atob(cleanStr);
        }
        return Buffer.from(str, 'base64').toString('binary');
    };

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
                scale: 3, 
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            textareas.forEach(ta => ta.style.height = '');
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Add the Amiri font
            pdf.addFileToVFS("Amiri-Regular.ttf", b64Decode(AmiriFont));
            pdf.addFont("Amiri-Regular.ttf", "Amiri", "normal");
            pdf.setFont("Amiri");
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 10; // 10mm margin
            const contentWidth = pdfWidth - (margin * 2);
            
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;

            let imgHeight = contentWidth / ratio;

            if (imgHeight > pdfHeight - (margin * 2)) {
                imgHeight = pdfHeight - (margin * 2);
            }
            const imgWidth = imgHeight * ratio;

            const xPos = (pdfWidth - imgWidth) / 2;
            const yPos = margin;

            pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);
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
  
    const handlePrint = async () => {
        const pdfBlob = await handleGeneratePdf();
        if (pdfBlob) {
            const url = URL.createObjectURL(pdfBlob);
            window.open(url);
        }
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
      <div className="p-4 sm:p-6 lg:p-8 text-right print:hidden">
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
                    <Printer className="ml-2 h-4 w-4" />
                    طباعة / تحميل PDF
                </Button>
            </div>
        </PageHeader>
      </div>
      
      <main className="bg-muted/30 p-4 sm:p-6 lg:p-10 print:p-0">
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
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-1">
                                <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="رقم الفاتورة" />
                                <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
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
                                     <Label className="text-xs md:hidden mb-1 block">السعر</Label>
                                     <Input type="number" value={item.price} onChange={e => handleItemChange(item.id, 'price', Number(e.target.value))} className="text-center" placeholder="السعر" />
                                </div>
                                <p className="col-span-3 md:col-span-1 text-center font-medium self-center pt-7 md:pt-0">{new Intl.NumberFormat('ar-SA').format(item.quantity * item.price)}</p>
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
            <div id="invoice-sheet" ref={invoiceSheetRef} className="bg-card text-card-foreground shadow-lg rounded-lg print:shadow-none print:border-0 print:rounded-none">
                <div className="p-8 md:p-12 space-y-10">
                    <header className="grid grid-cols-2 items-start">
                        <div />
                        <div className="flex flex-col items-end gap-1" dir="rtl">
                            <h1 className="text-3xl font-bold text-primary">فاتورة مبيعات</h1>
                            <p className="text-muted-foreground">{invoiceNumber}</p>
                        </div>
                    </header>
                    <Separator/>
                    <section className="grid grid-cols-3 gap-6 text-sm">
                        <div className="grid gap-1">
                            <h2 className="font-bold text-muted-foreground mb-1">المرسل</h2>
                            <div className="whitespace-pre-wrap">{yourDetails}</div>
                        </div>
                        <div className="grid gap-1">
                            <h2 className="font-bold text-muted-foreground mb-1">العميل</h2>
                            <p className="font-semibold">{clientName}</p>
                            <p>{clientCompany}</p>
                        </div>
                        <div className="grid gap-1 text-right">
                             <div className="grid grid-cols-2">
                                <span className="font-bold">تاريخ الإصدار:</span>
                                <span>{format(new Date(invoiceDate), "d MMMM yyyy", { locale: ar })}</span>
                             </div>
                             <div className="grid grid-cols-2">
                                <span className="font-bold">تاريخ الاستحقاق:</span>
                                <span>{format(new Date(dueDate), "d MMMM yyyy", { locale: ar })}</span>
                             </div>
                            {projectName && (
                                <div className="grid grid-cols-2 mt-2">
                                    <span className="font-bold">المشروع:</span>
                                    <span>{projectName}</span>
                                </div>
                            )}
                        </div>
                    </section>
                    <section>
                          <Table dir="rtl">
                              <TableHeader>
                                  <TableRow className="bg-muted/50">
                                      <TableHead className="w-[50%] rounded-r-lg">الخدمة / المنتج</TableHead>
                                      <TableHead className="text-center">الكمية</TableHead>
                                      <TableHead className="text-center">سعر الوحدة</TableHead>
                                      <TableHead className="text-left rounded-l-lg">الإجمالي</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                 {lineItems.map(item => (
                                      <TableRow key={item.id} className="border-b">
                                          <TableCell className="font-medium whitespace-pre-wrap">{item.description}</TableCell>
                                          <TableCell className="text-center">{new Intl.NumberFormat('ar-SA').format(item.quantity)}</TableCell>
                                          <TableCell className="text-center">{new Intl.NumberFormat('ar-SA').format(item.price)}</TableCell>
                                          <TableCell className="text-left font-medium">{new Intl.NumberFormat('ar-SA').format(item.quantity * item.price)}</TableCell>
                                      </TableRow>
                                 ))}
                              </TableBody>
                          </Table>
                    </section>
                    <section className="grid grid-cols-1 md:grid-cols-2 items-start gap-12">
                       <div className="grid gap-2 text-sm">
                            <h3 className="font-bold text-muted-foreground">ملاحظات</h3>
                            <p className="whitespace-pre-wrap">{notes}</p>
                       </div>
                       <div className="text-right space-y-2" dir="rtl">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">المجموع الفرعي:</span>
                                <span dir="ltr" className="font-medium">{new Intl.NumberFormat('ar-SA').format(subtotal)} <span className="saudi-riyal">&#xea;</span></span>
                            </div>
                            <Separator />
                             <div className="flex justify-between font-bold text-xl bg-primary/10 p-3 rounded-lg text-primary">
                                <span>الإجمالي المستحق:</span>
                                <span dir="ltr">{new Intl.NumberFormat('ar-SA').format(total)} <span className="saudi-riyal">&#xea;</span></span>
                            </div>
                       </div>
                    </section>
                    <footer className="pt-8 text-center text-xs text-muted-foreground">
                       <p>في حال وجود أي استفسار بخصوص هذه الفاتورة، يرجى التواصل معنا.</p>
                    </footer>
                </div>
            </div>
          </div>
      </main>
    </>
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
