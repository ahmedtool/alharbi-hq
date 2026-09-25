
"use client";

import * as React from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { PlusCircle, Trash2, MoreHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


type BotType = 'general' | 'jobs';
interface Channel {
    id: string;
    name: string;
    chatId: string;
    bot: BotType;
}

const botTypeMap: Record<BotType, string> = {
    general: 'البوت العام',
    jobs: 'بوت الوظائف',
}

const ChannelForm = ({ 
    channel,
    onSave, 
    onClose 
}: { 
    channel?: Channel | null;
    onSave: () => void, 
    onClose: () => void 
}) => {
  const { toast } = useToast();
  const [name, setName] = React.useState(channel?.name || "");
  const [chatId, setChatId] = React.useState(channel?.chatId || "");
  const [bot, setBot] = React.useState<BotType>(channel?.bot || 'general');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async () => {
    if (!name || !chatId) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "الرجاء تعبئة اسم القناة والمعرف الخاص بها.",
        });
        return;
    }
    setIsLoading(true);
    try {
        const channelData = { name, chatId, bot };
        if (channel) {
             await updateDoc(doc(db, "telegram_channels", channel.id), channelData);
             toast({ title: "تم تحديث القناة بنجاح!" });
        } else {
            await addDoc(collection(db, "telegram_channels"), channelData);
            toast({ title: "تم إضافة القناة بنجاح!" });
        }

        onSave();
        onClose();
    } catch (error) {
        console.error("Error saving channel: ", error);
        toast({
            variant: "destructive",
            title: "حدث خطأ",
            description: "لم نتمكن من حفظ القناة. الرجاء المحاولة مرة أخرى.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
            <DialogTitle>{channel ? 'تعديل القناة' : 'إضافة قناة تيليجرام جديدة'}</DialogTitle>
            <DialogDescription>
                أدخل اسمًا مميزًا للقناة، المعرف الخاص بها، واختر البوت المستخدم للنشر فيها.
            </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-right">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="channel-name" className="text-right">اسم القناة</Label>
                <Input id="channel-name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" placeholder="مثال: قناتي التقنية"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="chat-id" className="text-right">Chat ID</Label>
                <Input id="chat-id" value={chatId} onChange={e => setChatId(e.target.value)} className="col-span-3" dir="ltr" placeholder="-100xxxxxxxxxx or @channel_username"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bot-type" className="text-right">نوع البوت</Label>
                <Select value={bot} onValueChange={(v) => setBot(v as BotType)}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="اختر البوت"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="general">{botTypeMap.general}</SelectItem>
                        <SelectItem value="jobs">{botTypeMap.jobs}</SelectItem>
                    </SelectContent>
                </Select>
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


export default function ChannelsPage() {
    const { toast } = useToast();
    const [channels, setChannels] = React.useState<Channel[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [selectedChannel, setSelectedChannel] = React.useState<Channel | null>(null);

    const fetchChannels = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "telegram_channels"));
            const channelsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Channel));
            setChannels(channelsData);
        } catch (error) {
            console.error("Error fetching channels: ", error);
            toast({ variant: "destructive", title: "حدث خطأ أثناء جلب القنوات." });
        } finally {
            setIsLoading(false);
        }
    },[toast]);
    
    React.useEffect(() => {
        fetchChannels();
    }, [fetchChannels]);

    const handleEdit = (channel: Channel) => {
        setSelectedChannel(channel);
        setIsDialogOpen(true);
    };

    const handleDelete = async (channelId: string) => {
        if (!window.confirm("هل أنت متأكد أنك تريد حذف هذه القناة؟")) return;
        try {
            await deleteDoc(doc(db, "telegram_channels", channelId));
            toast({ title: "تم حذف القناة بنجاح" });
            fetchChannels();
        } catch (error) {
            console.error("Error deleting channel: ", error);
            toast({ variant: "destructive", title: "حدث خطأ أثناء حذف القناة." });
        }
    };

    const handleOpenDialog = (channel: Channel | null = null) => {
        setSelectedChannel(channel);
        setIsDialogOpen(true);
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 text-right">
            <PageHeader title="قنوات تيليجرام" description="إدارة قنوات تيليجرام التي يمكنك النشر فيها.">
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
                            <PlusCircle className="ml-2 h-4 w-4" />
                            إضافة قناة
                        </Button>
                    </DialogTrigger>
                    <ChannelForm
                        channel={selectedChannel}
                        onSave={() => {
                            fetchChannels();
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
                            <TableHead>اسم القناة</TableHead>
                            <TableHead>Chat ID</TableHead>
                            <TableHead>البوت المستخدم</TableHead>
                            <TableHead>
                                <span className="sr-only">الإجراءات</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 2 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                </TableRow>
                            ))
                        ) : channels.length > 0 ? (
                            channels.map(channel => (
                                <TableRow key={channel.id}>
                                    <TableCell className="font-medium">{channel.name}</TableCell>
                                    <TableCell className="font-mono" dir="ltr">{channel.chatId}</TableCell>
                                    <TableCell>{botTypeMap[channel.bot] || 'غير محدد'}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">فتح القائمة</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(channel)}>تعديل</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(channel.id)} className="text-destructive">حذف</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">
                                    لا توجد قنوات محفوظة.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
