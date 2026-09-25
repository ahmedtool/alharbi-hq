
'use client';

import * as React from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit, Star, Loader2, BookOpen, Dumbbell, Pizza, Code, Pencil, Video, TrendingUp, DollarSign, Check, Bike, Coffee, Book, Plane, Bed, Target, Award, CalendarDays } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getDaysInMonth, format, isSameDay, startOfMonth, addMonths, subMonths, getMonth, getYear } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LucideIcon } from 'lucide-react';
import useClient from '@/hooks/use-client';


const iconMap: { [key: string]: LucideIcon } = {
    BookOpen, Dumbbell, Pizza, Code, Pencil, Video, TrendingUp, DollarSign, Check, Bike, Coffee, Book, Plane, Bed, Star, Target, Award
};

const iconOptions = [
    { value: 'BookOpen', label: 'قراءة', icon: BookOpen },
    { value: 'Dumbbell', label: 'رياضة', icon: Dumbbell },
    { value: 'Code', label: 'برمجة', icon: Code },
    { value: 'Pencil', label: 'كتابة', icon: Pencil },
    { value: 'Video', label: 'مشاهدة', icon: Video },
    { value: 'TrendingUp', label: 'تطور', icon: TrendingUp },
    { value: 'DollarSign', label: 'مالية', icon: DollarSign },
    { value: 'Check', label: 'إنجاز مهمة', icon: Check },
    { value: 'Bike', label: 'ركوب دراجة', icon: Bike },
    { value: 'Coffee', label: 'قهوة', icon: Coffee },
    { value: 'Plane', label: 'سفر', icon: Plane },
    { value: 'Bed', label: 'نوم', icon: Bed },
    { value: 'Target', label: 'هدف', icon: Target },
    { value: 'Award', label: 'جائزة', icon: Award },
    { value: 'Star', label: 'عادة مميزة', icon: Star },
    { value: 'Pizza', label: 'أكل صحي', icon: Pizza },
];

type HabitType = 'daily';

interface Habit {
    id: string;
    name: string;
    description: string;
    icon: string;
    type: HabitType;
    completions: string[]; // Store dates as ISO strings 'yyyy-MM-dd'
    createdAt: Timestamp;
}

const HabitForm = ({ habit, onSave, onClose }: { habit?: Habit | null, onSave: () => void, onClose: () => void }) => {
    const { toast } = useToast();
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [icon, setIcon] = React.useState('Star');
    const [type, setType] = React.useState<HabitType>('daily');
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        if (habit) {
            setName(habit.name || '');
            setDescription(habit.description || '');
            setIcon(habit.icon || 'Star');
            setType(habit.type || 'daily');
        } else {
            setName('');
            setDescription('');
            setIcon('Star');
            setType('daily');
        }
    }, [habit]);

    const handleSubmit = async () => {
        if (!name) {
            toast({ variant: 'destructive', title: 'الرجاء إدخال اسم العادة.' });
            return;
        }
        setIsLoading(true);
        try {
            const habitData = { name, description, icon, type };
            if (habit) {
                await updateDoc(doc(db, 'habits', habit.id), habitData);
                toast({ title: 'تم تحديث العادة بنجاح' });
            } else {
                await addDoc(collection(db, 'habits'), {
                    ...habitData,
                    completions: [],
                    createdAt: Timestamp.now(),
                });
                toast({ title: 'تمت إضافة العادة بنجاح' });
            }
            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving habit:', error);
            toast({ variant: 'destructive', title: 'حدث خطأ أثناء حفظ العادة.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{habit ? 'تعديل العادة' : 'إضافة عادة جديدة'}</DialogTitle>
                <DialogDescription>أدخل تفاصيل عادتك الجديدة التي تريد تتبعها.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-right">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">اسم العادة</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" placeholder="مثال: القراءة لمدة 30 دقيقة" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">الوصف</Label>
                    <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} className="col-span-3" placeholder="وصف موجز للعادة (اختياري)" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="icon-select" className="text-right">الأيقونة</Label>
                    <Select value={icon} onValueChange={setIcon}>
                        <SelectTrigger id="icon-select" className="col-span-3">
                            <SelectValue placeholder="اختر أيقونة..." />
                        </SelectTrigger>
                        <SelectContent>
                            {iconOptions.map(({ value, label, icon: IconComponent }) => (
                                <SelectItem key={value} value={value}>
                                    <div className="flex items-center gap-2">
                                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                                        <span>{label}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="type-select" className="text-right">نوع العادة</Label>
                    <Select value={type} onValueChange={(v) => setType(v as HabitType)}>
                        <SelectTrigger id="type-select" className="col-span-3">
                            <SelectValue placeholder="اختر النوع" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="daily">يومي</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onClose}>إلغاء</Button>
                <Button onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                    {isLoading ? 'جاري الحفظ...' : 'حفظ'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};


export default function HabitTrackerPage() {
    const { toast } = useToast();
    const [habits, setHabits] = React.useState<Habit[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [selectedHabit, setSelectedHabit] = React.useState<Habit | null>(null);
    const [currentMonth, setCurrentMonth] = React.useState(new Date());
    const isClient = useClient();

    const fetchHabits = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, 'habits'), orderBy('createdAt', 'asc'));
            const querySnapshot = await getDocs(q);
            setHabits(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit)));
        } catch (error) {
            console.error('Error fetching habits:', error);
            toast({ variant: 'destructive', title: 'حدث خطأ أثناء جلب العادات.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchHabits();
    }, [fetchHabits]);
    
    const handleToggleDay = async (habit: Habit, day: Date) => {
        const dateString = format(day, 'yyyy-MM-dd');
        const isCompleted = habit.completions.includes(dateString);
        
        const updatedCompletions = isCompleted
            ? habit.completions.filter(d => d !== dateString)
            : [...habit.completions, dateString];

        setHabits(habits.map(h => h.id === habit.id ? { ...h, completions: updatedCompletions } : h));

        try {
            const habitRef = doc(db, 'habits', habit.id);
            await updateDoc(habitRef, { completions: updatedCompletions });
        } catch (error) {
            console.error('Error updating habit completion:', error);
            toast({ variant: 'destructive', title: 'فشل تحديث الإنجاز.' });
            // Revert state on failure
             const q = query(collection(db, 'habits'), orderBy('createdAt', 'asc'));
            const querySnapshot = await getDocs(q);
            setHabits(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit)));
        }
    };

    const handleEdit = (habit: Habit) => {
        setSelectedHabit(habit);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد أنك تريد حذف هذه العادة وكل سجلها؟')) return;
        try {
            await deleteDoc(doc(db, 'habits', id));
            toast({ title: 'تم حذف العادة بنجاح' });
            fetchHabits();
        } catch (error) {
            console.error('Error deleting habit:', error);
            toast({ variant: 'destructive', title: 'حدث خطأ أثناء حذف العادة.' });
        }
    };
    
    const daysInMonth = isClient ? getDaysInMonth(currentMonth) : 30;
    const monthDays = isClient ? Array.from({ length: daysInMonth }, (_, i) => {
        const day = new Date(currentMonth);
        day.setDate(i + 1);
        return day;
    }) : [];

    const changeMonth = (amount: number) => {
        setCurrentMonth(prev => amount > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
    };

    const { totalHabits, bestHabit, totalCompletionsThisMonth } = React.useMemo(() => {
        const totalHabits = habits.length;
        let bestHabit = { name: 'لا يوجد', completions: 0 };
        let totalCompletionsThisMonth = 0;
        
        if (!isClient) {
             return { totalHabits, bestHabit, totalCompletionsThisMonth };
        }

        const currentMonthIndex = getMonth(currentMonth);
        const currentYearValue = getYear(currentMonth);

        habits.forEach(habit => {
            const completionsThisMonth = habit.completions.filter(dateStr => {
                const d = new Date(dateStr);
                return getMonth(d) === currentMonthIndex && getYear(d) === currentYearValue;
            }).length;

            totalCompletionsThisMonth += completionsThisMonth;
            
            if (completionsThisMonth > bestHabit.completions) {
                bestHabit = { name: habit.name, completions: completionsThisMonth };
            }
        });
        
        return { totalHabits, bestHabit, totalCompletionsThisMonth };

    }, [habits, currentMonth, isClient]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 text-right">
            <PageHeader title="متتبع العادات والأهداف" description="راقب التزامك بعاداتك اليومية وحقق أهدافك.">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => { setSelectedHabit(null); setIsDialogOpen(true); }}>
                            <PlusCircle className="ml-2 h-4 w-4" />
                            إضافة عادة جديدة
                        </Button>
                    </DialogTrigger>
                    <HabitForm habit={selectedHabit} onSave={() => { fetchHabits(); setIsDialogOpen(false); }} onClose={() => setIsDialogOpen(false)} />
                </Dialog>
            </PageHeader>
            <main className="space-y-8">
                 {/* Stats Dashboard */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">إجمالي العادات</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-1/4"/> : new Intl.NumberFormat('ar-SA').format(totalHabits)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">أفضل عادة هذا الشهر</CardTitle>
                            <Award className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                           <div className="text-2xl font-bold truncate">{isLoading || !isClient ? <Skeleton className="h-8 w-3/4"/> : bestHabit.name}</div>
                           <p className="text-xs text-muted-foreground">{isClient ? `${new Intl.NumberFormat('ar-SA').format(bestHabit.completions)} يوم` : ''}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">إجمالي أيام الإنجاز (هذا الشهر)</CardTitle>
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                           <div className="text-2xl font-bold">{isLoading || !isClient ? <Skeleton className="h-8 w-1/4"/> : new Intl.NumberFormat('ar-SA').format(totalCompletionsThisMonth)}</div>
                           <p className="text-xs text-muted-foreground">{isClient ? `إنجاز في ${format(currentMonth, 'MMMM', { locale: ar })}` : ''}</p>
                        </CardContent>
                    </Card>
                </div>


                {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
                ) : habits.length > 0 ? (
                    <>
                        <Card>
                            <CardHeader className="flex-row items-center justify-between">
                                <CardTitle>سجل الإنجاز الشهري</CardTitle>
                                {isClient && (
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" onClick={() => changeMonth(-1)}>الشهر السابق</Button>
                                    <span className="font-bold text-lg">{format(currentMonth, 'MMMM yyyy', { locale: ar })}</span>
                                    <Button variant="outline" onClick={() => changeMonth(1)}>الشهر التالي</Button>
                                </div>
                                )}
                            </CardHeader>
                            {isClient && (
                            <CardContent className="overflow-x-auto">
                                <div className="grid" style={{ gridTemplateColumns: `auto repeat(${daysInMonth}, minmax(40px, 1fr))` }}>
                                    <div className="font-bold border-b border-l p-2 sticky right-0 bg-card">العادة</div>
                                    {monthDays.map(day => (
                                        <div key={day.toISOString()} className="text-center font-bold border-b p-2">
                                            <div className={cn("text-xs", isSameDay(day, new Date()) && "text-primary")}>{format(day, 'EEE', { locale: ar })}</div>
                                            <div className={cn("text-lg", isSameDay(day, new Date()) && "text-primary font-extrabold")}>{format(day, 'd')}</div>
                                        </div>
                                    ))}

                                    {habits.map(habit => {
                                        const Icon = iconMap[habit.icon] || Star;
                                        return (
                                            <React.Fragment key={habit.id}>
                                                <div className="font-medium border-l p-2 flex items-center gap-2 sticky right-0 bg-card">
                                                    <Icon className="h-5 w-5 text-muted-foreground" />
                                                    <div className='flex flex-col'>
                                                        <span className="truncate font-semibold">{habit.name}</span>
                                                        <span className="text-xs text-muted-foreground">{habit.type === 'daily' ? 'يومي' : habit.type}</span>
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 mr-auto">
                                                                <Edit className="h-3 w-3 text-muted-foreground" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onSelect={() => handleEdit(habit)}>تعديل</DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => handleDelete(habit.id)} className="text-destructive">حذف</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                                {monthDays.map(day => {
                                                    const isCompleted = habit.completions.includes(format(day, 'yyyy-MM-dd'));
                                                    return (
                                                        <div key={day.toISOString()} className="border-b p-2 flex items-center justify-center">
                                                            <button 
                                                                onClick={() => handleToggleDay(habit, day)} 
                                                                className={cn(
                                                                    "h-8 w-8 rounded-md border transition-colors flex items-center justify-center",
                                                                    isCompleted ? "bg-primary border-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted",
                                                                    isSameDay(day, new Date()) && "border-primary"
                                                                )}
                                                                aria-label={`Mark habit ${habit.name} for ${format(day, 'yyyy-MM-dd')} as ${isCompleted ? 'not completed' : 'completed'}`}
                                                            >
                                                                {isCompleted ? <Check className="h-5 w-5"/> : ''}
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </React.Fragment>
                                        )
                                    })}
                                </div>
                            </CardContent>
                            )}
                        </Card>
                    </>
                ) : (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[50vh]">
                        <div className="flex flex-col items-center gap-2 text-center">
                            <h3 className="text-2xl font-bold tracking-tight">ابدأ رحلتك نحو أهدافك</h3>
                            <p className="text-sm text-muted-foreground">لم تقم بإضافة أي عادات لتتبعها بعد. أضف عادتك الأولى للبدء.</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
