
"use client";

import * as React from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Globe } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    cost?: number;
    isPublic: boolean;
}

const ProductForm = ({ 
    product, 
    onSave, 
    onClose 
}: { 
    product?: Product | null, 
    onSave: () => void, 
    onClose: () => void 
}) => {
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState(0);
  const [cost, setCost] = React.useState(0);
  const [isPublic, setIsPublic] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (product) {
        setName(product.name || "");
        setDescription(product.description || "");
        setPrice(product.price || 0);
        setCost(product.cost || 0);
        setIsPublic(product.isPublic || false);
    } else {
        setName("");
        setDescription("");
        setPrice(0);
        setCost(0);
        setIsPublic(false);
    }
  }, [product]);

  const handleSubmit = async () => {
    if (!name || price === null || price < 0) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "الرجاء تعبئة جميع الحقول بشكل صحيح.",
        });
        return;
    }
    setIsLoading(true);
    try {
        const productData = { 
            name, 
            description,
            price: Number(price), 
            cost: Number(cost),
            isPublic: isPublic,
        };

        if (product) {
            const productRef = doc(db, "products", product.id);
            await updateDoc(productRef, productData);
            toast({ title: "تم تحديث المنتج بنجاح!" });
        } else {
            await addDoc(collection(db, "products"), productData);
            toast({ title: "تم إضافة المنتج بنجاح!" });
        }
        onSave();
        onClose();
    } catch (error) {
        console.error("Error saving product: ", error);
        toast({
            variant: "destructive",
            title: "حدث خطأ",
            description: "لم نتمكن من حفظ المنتج.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
        <DialogHeader>
            <DialogTitle>{product ? "تعديل منتج/خدمة" : "إضافة منتج/خدمة"}</DialogTitle>
            <DialogDescription>
                أدخل تفاصيل المنتج أو الخدمة. سيتم استخدام الوصف في الفواتير تلقائيًا.
            </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-right">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="productName" className="text-right">الاسم</Label>
                <Input id="productName" value={name} onChange={e => setName(e.target.value)} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">الوصف</Label>
                <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="وصف موجز للمنتج/الخدمة..." className="col-span-3" rows={3} />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="price" className="text-right">سعر البيع (ر.س)</Label>
                    <Input id="price" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="cost" className="text-right">التكلفة (ر.س)</Label>
                    <Input id="cost" type="number" value={cost} onChange={e => setCost(Number(e.target.value))} />
                </div>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse pt-2">
                <Checkbox id="is-public" checked={isPublic} onCheckedChange={(checked) => setIsPublic(Boolean(checked))} />
                <label
                    htmlFor="is-public"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    عرض المنتج في الموقع العام
                </label>
            </div>
        </div>
        <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
        </DialogFooter>
    </DialogContent>
  );
};


export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);

  const fetchProducts = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(data);
    } catch (error) {
        toast({ variant: "destructive", title: "حدث خطأ أثناء جلب المنتجات." });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm("هل أنت متأكد أنك تريد حذف هذا المنتج؟")) return;
    try {
        await deleteDoc(doc(db, "products", product.id));
        toast({ title: "تم حذف المنتج بنجاح" });
        fetchProducts();
    } catch (error) {
        toast({ variant: "destructive", title: "حدث خطأ أثناء حذف المنتج." });
    }
  };
  
  const handleOpenDialog = (product: Product | null = null) => {
      setSelectedProduct(product);
      setIsDialogOpen(true);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader
        title="المنتجات والخدمات"
        description="إدارة المنتجات والخدمات التي تقدمها لتسهيل إنشاء الفواتير."
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="ml-2 h-4 w-4" />
              إضافة منتج/خدمة
            </Button>
          </DialogTrigger>
          <ProductForm 
            product={selectedProduct} 
            onSave={() => {
                fetchProducts();
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
              <TableHead className="w-[40%] sm:w-[50%]">المنتج/الخدمة</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead className="hidden sm:table-cell">التكلفة</TableHead>
              <TableHead className="hidden sm:table-cell">صافي الربح</TableHead>
              <TableHead>
                <span className="sr-only">الإجراءات</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell>
                            <Skeleton className="h-5 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-full" />
                        </TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                ))
            ) : products.length > 0 ? (
                products.map(prod => {
                    const profit = prod.price - (prod.cost || 0);
                    return (
                    <TableRow key={prod.id}>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                {prod.isPublic && <span title="منتج عام"><Globe className="h-4 w-4 text-sky-500 flex-shrink-0" aria-label="منتج عام"/></span>}
                                <p className="font-medium">{prod.name}</p>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 pr-6">{prod.description}</p>
                        </TableCell>
                        <TableCell dir="ltr">{new Intl.NumberFormat('ar-SA').format(prod.price)} <span className="saudi-riyal">&#xea;</span></TableCell>
                        <TableCell dir="ltr" className="hidden sm:table-cell">{new Intl.NumberFormat('ar-SA').format(prod.cost || 0)} <span className="saudi-riyal">&#xea;</span></TableCell>
                        <TableCell dir="ltr" className={`hidden sm:table-cell ${profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {new Intl.NumberFormat('ar-SA').format(profit)} <span className="saudi-riyal">&#xea;</span>
                        </TableCell>
                        <TableCell>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">فتح القائمة</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(prod)}>تعديل</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(prod)} className="text-destructive">حذف</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                )})
            ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        لا توجد منتجات أو خدمات محفوظة حاليًا.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
