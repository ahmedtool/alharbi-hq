
"use client";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileText, Upload, Eye, Trash2, Folder, Search, FolderPlus, Edit, Home, ChevronRight, Save, Move, Check, Banknote, Copy, X } from "lucide-react";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { collection, addDoc, getDocs, doc, deleteDoc, serverTimestamp, query, orderBy, where, updateDoc, writeBatch, setDoc, getDoc } from "@/lib/db";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "@/lib/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface FileData {
    id: string;
    name: string;
    url: string;
    path: string;
    size: number;
    parentId: string;
    createdAt: any;
    type: 'file';
}

interface FolderData {
    id: string;
    name: string;
    parentId: string;
    createdAt: any;
    type: 'folder';
}

type LegalDoc = {
    id: string;
    name: string;
    url: string;
    path: string;
}

type PathSegment = { id: string; name: string };
const ROOT_FOLDER_ID = 'root';

export default function FilesPage() {
  const { toast } = useToast();
  const [allFiles, setAllFiles] = useState<FileData[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [iban, setIban] = React.useState("");
  const [freelanceDoc, setFreelanceDoc] = React.useState<LegalDoc | null>(null);
  const [ibanFiles, setIbanFiles] = React.useState<LegalDoc[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isLegalLoading, setIsLegalLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderData | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [currentPath, setCurrentPath] = useState<PathSegment[]>([]);

  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<FileData | null>(null);
  const [newFileName, setNewFileName] = useState("");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [moveTargetParentId, setMoveTargetParentId] = useState<string>(ROOT_FOLDER_ID);
  const [availableFolders, setAvailableFolders] = useState<FolderData[]>([]);
  const [isMoving, setIsMoving] = useState(false);

  const currentFolderId = useMemo(() => currentPath.length > 0 ? currentPath[currentPath.length - 1].id : ROOT_FOLDER_ID, [currentPath]);

  const fetchFilesAndFolders = useCallback(async () => {
    setIsLoading(true);
    try {
      const filesQuery = query(collection(db, "files"), where("parentId", "==", currentFolderId), orderBy("createdAt", "desc"));
      const filesSnapshot = await getDocs(filesQuery);
      const filesData = filesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'file' } as FileData));
      setAllFiles(filesData);

      const foldersQuery = query(collection(db, "folders"), where("parentId", "==", currentFolderId), orderBy("name", "asc"));
      const foldersSnapshot = await getDocs(foldersQuery);
      const foldersData = foldersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'folder' } as FolderData));
      setFolders(foldersData);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: "destructive", title: "خطأ", description: "لم نتمكن من جلب الملفات والمجلدات." });
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId, toast]);

  const fetchAllFolders = async () => {
      try {
          const q = query(collection(db, "folders"), orderBy("name", "asc"));
          const snap = await getDocs(q);
          const foldersData = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'folder' } as FolderData));
          setAvailableFolders(foldersData);
      } catch (error) {
          console.error("Error fetching folders for move:", error);
      }
  };

  const fetchLegalData = useCallback(async () => {
    setIsLegalLoading(true);
    try {
        const legalConfigDoc = await getDoc(doc(db, "legal_info", "config"));
        if(legalConfigDoc.exists()) {
            setIban(legalConfigDoc.data().iban || "");
        }

        const legalFilesSnapshot = await getDocs(collection(db, "legal_files"));
        const legalFiles = legalFilesSnapshot.docs.map(d => ({...d.data(), id: d.id})) as LegalDoc[];

        setFreelanceDoc(legalFiles.find(f => f.id === 'freelance_document') || null);
        setIbanFiles(legalFiles.filter(f => f.id.startsWith('iban_file_')));

    } catch (error) {
        console.error("Error fetching legal data:", error);
    } finally {
        setIsLegalLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilesAndFolders();
  }, [fetchFilesAndFolders]);

  useEffect(() => {
    if (currentFolderId === ROOT_FOLDER_ID) {
      fetchLegalData();
    }
  }, [currentFolderId, fetchLegalData]);
  
  const openFolderDialog = (folder: FolderData | null = null) => {
    setEditingFolder(folder);
    setNewFolderName(folder ? folder.name : "");
    setIsFolderDialogOpen(true);
  };
  
   const openRenameDialog = (file: FileData) => {
    setFileToRename(file);
    setNewFileName(file.name);
    setIsRenameDialogOpen(true);
  };

  const handleFolderSubmit = async () => {
    if (!newFolderName.trim()) return;
    try {
      if (editingFolder) {
        await updateDoc(doc(db, "folders", editingFolder.id), { name: newFolderName });
        toast({ title: "تم تحديث المجلد." });
      } else {
        await addDoc(collection(db, "folders"), {
          name: newFolderName,
          parentId: currentFolderId,
          createdAt: serverTimestamp(),
        });
        toast({ title: "تم إنشاء المجلد." });
      }
      setIsFolderDialogOpen(false);
      fetchFilesAndFolders();
    } catch (error) {
      toast({ variant: "destructive", title: "خطأ في المجلد" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    toast({ title: `جاري رفع ${files.length} ملف...` });
    
    const uploadPromises = Array.from(files).map(async (file) => {
        const storagePath = `files/${currentFolderId}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        await addDoc(collection(db, "files"), {
            name: file.name,
            url: downloadURL,
            path: storagePath,
            size: file.size,
            parentId: currentFolderId,
            createdAt: serverTimestamp(),
        });
    });

    try {
        await Promise.all(uploadPromises);
        toast({ title: "تم الرفع بنجاح." });
        fetchFilesAndFolders();
    } catch (error) {
        toast({ variant: "destructive", title: "خطأ في الرفع" });
    }
  };
  
  const handleRenameFile = async () => {
    if (!fileToRename || !newFileName.trim()) return;
    try {
      await updateDoc(doc(db, "files", fileToRename.id), { name: newFileName });
      toast({ title: "تم تغيير الاسم." });
      setIsRenameDialogOpen(false);
      fetchFilesAndFolders();
    } catch (error) {
       toast({ variant: "destructive", title: "خطأ في التسمية" });
    }
  };

  const handleDeleteFile = async (file: FileData) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${file.name}"؟`)) return;
    try {
      await deleteObject(ref(storage, file.path));
      await deleteDoc(doc(db, "files", file.id));
      toast({ title: "تم الحذف." });
      fetchFilesAndFolders();
    } catch (error) {
      toast({ variant: "destructive", title: "خطأ في الحذف" });
    }
  };

  const deleteFolderAndContents = async (folderId: string) => {
    const batch = writeBatch(db);
    const deleteRecursively = async (currentId: string) => {
        const filesSnapshot = await getDocs(query(collection(db, 'files'), where('parentId', '==', currentId)));
        for (const fileDoc of filesSnapshot.docs) {
            const fileData = fileDoc.data() as FileData;
            try { await deleteObject(ref(storage, fileData.path)); } catch (e) {}
            batch.delete(doc(db, 'files', fileDoc.id));
        }
        const subfoldersSnapshot = await getDocs(query(collection(db, 'folders'), where('parentId', '==', currentId)));
        for (const subfolderDoc of subfoldersSnapshot.docs) {
            await deleteRecursively(subfolderDoc.id);
        }
        batch.delete(doc(db, 'folders', currentId));
    };
    await deleteRecursively(folderId);
    await batch.commit();
  };

  const handleDeleteFolder = async (folder: FolderData) => {
    if (!window.confirm(`حذف المجلد "${folder.name}" ومحتوياته؟`)) return;
    try {
        await deleteFolderAndContents(folder.id);
        toast({ title: "تم حذف المجلد بنجاح." });
        fetchFilesAndFolders();
    } catch (error) {
        toast({ variant: "destructive", title: "خطأ في حذف المجلد" });
    }
  };

  const handleBulkDelete = async () => {
      if (selectedIds.size === 0) return;
      if (!window.confirm(`هل أنت متأكد من حذف ${selectedIds.size} عنصر؟`)) return;
      toast({ title: "جاري الحذف الجماعي..." });
      try {
          const selectedItems = [...folders, ...allFiles].filter(item => selectedIds.has(item.id));
          for (const item of selectedItems) {
              if (item.type === 'folder') {
                  await deleteFolderAndContents(item.id);
              } else {
                  try { await deleteObject(ref(storage, (item as FileData).path)); } catch (e) {}
                  await deleteDoc(doc(db, "files", item.id));
              }
          }
          toast({ title: "تم الحذف بنجاح." });
          fetchFilesAndFolders();
      } catch (error) {
          toast({ variant: "destructive", title: "خطأ في الحذف" });
      }
  };

  const handleBulkMove = async () => {
      if (selectedIds.size === 0) return;
      if (moveTargetParentId === currentFolderId) {
          toast({ variant: "destructive", title: "تنبيه", description: "المجلد المختار هو المجلد الحالي." });
          return;
      }
      setIsMoving(true);
      try {
          const batch = writeBatch(db);
          selectedIds.forEach(id => {
              const isFolder = folders.some(f => f.id === id);
              batch.update(doc(db, isFolder ? "folders" : "files", id), { parentId: moveTargetParentId });
          });
          await batch.commit();
          toast({ title: "تم النقل بنجاح." });
          setIsMoveDialogOpen(false);
          fetchFilesAndFolders();
      } catch (error) {
          toast({ variant: "destructive", title: "خطأ في النقل" });
      } finally {
          setIsMoving(false);
      }
  };

  const navigateToFolder = (folder: FolderData) => {
    setCurrentPath(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateToPathIndex = (index: number) => {
    setCurrentPath(prev => prev.slice(0, index + 1));
  };
  
  const navigateToRoot = () => {
    setCurrentPath([]);
  }

  const filteredItems = useMemo(() => {
    const combined: (FileData | FolderData)[] = [ ...folders, ...allFiles ];
    if (!searchTerm) return combined;
    return combined.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allFiles, folders, searchTerm]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: `${label} في الحافظة.` });
  };
  
  const handleSaveIban = async () => {
    try {
        await setDoc(doc(db, "legal_info", "config"), { iban: iban }, { merge: true });
        toast({ title: "تم حفظ الآيبان." });
    } catch(error) {
        toast({ variant: "destructive", title: "خطأ" });
    }
  }

  const handleLegalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'freelance' | 'iban') => {
      const file = e.target.files?.[0];
      if (!file) return;
      toast({ title: "جاري رفع الملف القانوني..." });
      try {
          const docId = type === 'freelance' ? 'freelance_document' : `iban_file_${Date.now()}`;
          const storagePath = `legal/${docId}_${file.name}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(storageRef);
          await setDoc(doc(db, "legal_files", docId), { name: file.name, url: downloadURL, path: storagePath });
          toast({ title: "تم الرفع." });
          fetchLegalData();
      } catch (error) {
          toast({ variant: "destructive", title: "فشل الرفع" });
      }
  }

  const handleDeleteLegalFile = async (docToDelete: LegalDoc) => {
    if (!window.confirm(`حذف الملف "${docToDelete.name}"؟`)) return;
    try {
        await deleteObject(ref(storage, docToDelete.path));
        await deleteDoc(doc(db, "legal_files", docToDelete.id));
        toast({ title: "تم الحذف." });
        fetchLegalData();
    } catch (error) {
        toast({ variant: "destructive", title: "خطأ" });
    }
  }

  const toggleSelect = (id: string) => {
      setSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === filteredItems.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredItems.map(i => i.id)));
      }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right">
      <PageHeader title="ملفاتي" description="إدارة ملفاتك ومجلداتك بنظام السحب والإسقاط والتحديد الجماعي.">
        <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={() => openFolderDialog()}><FolderPlus className="ml-2 h-4 w-4" /> مجلد جديد</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFolder ? 'تعديل اسم المجلد' : 'إنشاء مجلد جديد'}</DialogTitle>
            </DialogHeader>
            <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="اسم المجلد" onKeyDown={(e) => e.key === 'Enter' && handleFolderSubmit()} />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsFolderDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleFolderSubmit}>حفظ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button onClick={() => document.getElementById('new-file-upload')?.click()}>
          <Upload className="ml-2 h-4 w-4" /> رفع ملف
        </Button>
        <Input id="new-file-upload" type="file" multiple className="hidden" onChange={handleFileUpload}/>
      </PageHeader>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="ابحث في ملفاتك..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        
        {filteredItems.length > 0 && (
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                    {selectedIds.size === filteredItems.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                </Button>
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 bg-primary/5 p-1 px-3 rounded-lg border border-primary/20">
                        <span className="text-sm font-bold ml-2">{selectedIds.size} محدد</span>
                        <Dialog open={isMoveDialogOpen} onOpenChange={(open) => { if (open) fetchAllFolders(); setIsMoveDialogOpen(open); }}>
                            <DialogTrigger asChild>
                                <Button variant="secondary" size="sm"><Move className="h-3 w-3 ml-1"/> نقل</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>نقل العناصر</DialogTitle></DialogHeader>
                                <ScrollArea className="h-64 border rounded-md p-2">
                                    <div className="space-y-1">
                                        <Button variant={moveTargetParentId === ROOT_FOLDER_ID ? "secondary" : "ghost"} className="w-full justify-start h-9" onClick={() => setMoveTargetParentId(ROOT_FOLDER_ID)}>
                                            <Home className="ml-2 h-4 w-4"/> الرئيسية
                                            {moveTargetParentId === ROOT_FOLDER_ID && <Check className="mr-auto h-4 w-4"/>}
                                        </Button>
                                        {availableFolders.filter(f => !selectedIds.has(f.id)).map(folder => (
                                            <Button key={folder.id} variant={moveTargetParentId === folder.id ? "secondary" : "ghost"} className="w-full justify-start h-9" onClick={() => setMoveTargetParentId(folder.id)}>
                                                <Folder className="ml-2 h-4 w-4 text-amber-500"/> {folder.name}
                                                {moveTargetParentId === folder.id && <Check className="mr-auto h-4 w-4"/>}
                                            </Button>
                                        ))}
                                    </div>
                                </ScrollArea>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsMoveDialogOpen(false)}>إلغاء</Button>
                                    <Button onClick={handleBulkMove} disabled={isMoving}>{isMoving ? "جاري النقل..." : "تأكيد النقل"}</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button variant="destructive" size="sm" onClick={handleBulkDelete}><Trash2 className="h-3 w-3 ml-1"/> حذف</Button>
                    </div>
                )}
            </div>
        )}
      </div>

      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <button onClick={navigateToRoot} className="hover:text-primary flex items-center gap-1"><Home className="h-4 w-4"/> الرئيسية</button>
        {currentPath.map((segment, index) => (
            <React.Fragment key={segment.id}>
                <ChevronRight className="h-4 w-4"/>
                <button onClick={() => navigateToPathIndex(index)} className="hover:text-primary">{segment.name}</button>
            </React.Fragment>
        ))}
      </nav>

      <div className="grid gap-8">
        <section>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => (
                <Card key={item.id} className={cn("flex flex-col group/item transition-all duration-200", selectedIds.has(item.id) && "ring-2 ring-primary border-primary bg-primary/5")}>
                  <CardHeader className="flex-1 relative" onDoubleClick={() => item.type === 'folder' && navigateToFolder(item as FolderData)}>
                     <div className="absolute top-3 right-3 z-10">
                        <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} className="h-5 w-5 bg-background" />
                     </div>
                     <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            {item.type === 'folder' ? <Folder className="w-8 h-8 text-amber-500 flex-shrink-0" /> : <FileText className="w-8 h-8 text-primary flex-shrink-0" />}
                            <CardTitle className="text-base break-all cursor-pointer select-none" onClick={() => toggleSelect(item.id)}>{item.name}</CardTitle>
                        </div>
                         <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); if(item.type === 'folder') openFolderDialog(item as FolderData); if(item.type === 'file') openRenameDialog(item as FileData); }}>
                                  <Edit className="h-4 w-4 text-muted-foreground"/>
                              </Button>
                         </div>
                    </div>
                    {item.type === 'file' && <CardDescription>{((item as FileData).size / 1024).toFixed(2)} KB</CardDescription>}
                  </CardHeader>
                  <CardContent className="flex justify-between items-center mt-auto p-4 pt-0">
                    <div>{item.type === 'folder' && <Button variant="ghost" size="sm" onClick={() => navigateToFolder(item as FolderData)}>فتح</Button>}</div>
                    <div className="flex gap-1">
                        {item.type === 'file' && <Button variant="outline" size="sm" onClick={() => { setPreviewFile(item as FileData); setIsPreviewOpen(true); }}><Eye className="ml-1 h-3 w-3"/> عرض</Button>}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => item.type === 'file' ? handleDeleteFile(item as FileData) : handleDeleteFolder(item as FolderData)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[30vh]"><p className="text-muted-foreground">لا توجد عناصر هنا.</p></div>
          )}
        </section>

        {currentFolderId === ROOT_FOLDER_ID && (
          <section className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><div className="flex items-center gap-3"><Banknote className="w-8 h-8 text-muted-foreground" /><CardTitle>الآيبان البنكي</CardTitle></div></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input value={iban} onChange={(e) => setIban(e.target.value)} className="font-mono text-lg" dir="ltr" />
                    <Button variant="outline" size="icon" onClick={() => handleCopy(iban, "الآيبان")}><Copy className="h-4 w-4"/></Button>
                    <Button variant="outline" size="icon" onClick={handleSaveIban}><Save className="h-4 w-4"/></Button>
                  </div>
                   <div className="space-y-2">
                       {ibanFiles.map(file => (
                           <div key={file.id} className="flex items-center justify-between p-2 rounded-md border text-sm">
                               <p className="truncate">{file.name}</p>
                               <div className="flex gap-1">
                                   <Button variant="ghost" size="icon" onClick={() => window.open(file.url, '_blank')}><Eye className="h-4 w-4"/></Button>
                                   <Button variant="ghost" size="icon" onClick={() => handleDeleteLegalFile(file)} className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                               </div>
                           </div>
                       ))}
                       <Button size="sm" variant="outline" className="w-full" onClick={() => document.getElementById('iban-file-upload')?.click()}><Upload className="ml-2 h-4 w-4"/> رفع ملف للآيبان</Button>
                       <Input id="iban-file-upload" type="file" className="hidden" onChange={(e) => handleLegalFileUpload(e, 'iban')} />
                   </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><div className="flex items-center gap-3"><FileText className="w-8 h-8 text-muted-foreground" /><CardTitle>وثيقة العمل الحر</CardTitle></div></CardHeader>
                <CardContent>
                  {freelanceDoc ? (
                      <div className="flex items-center justify-between p-2 border rounded-md text-sm">
                        <p className="truncate">{freelanceDoc.name}</p>
                        <div className="flex gap-1">
                           <Button variant="ghost" size="icon" onClick={() => window.open(freelanceDoc.url, '_blank')}><Eye className="h-4 w-4"/></Button>
                           <Button variant="ghost" size="icon" onClick={() => handleDeleteLegalFile(freelanceDoc)} className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                        </div>
                      </div>
                  ) : (
                    <Button size="sm" onClick={() => document.getElementById('freelance-doc-upload')?.click()}><Upload className="ml-2 h-4 w-4"/> تحميل الوثيقة</Button>
                  )}
                  <Input id="freelance-doc-upload" type="file" className="hidden" onChange={(e) => handleLegalFileUpload(e, 'freelance')} />
                </CardContent>
              </Card>
          </section>
        )}
      </div>

       <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader><DialogTitle>{previewFile?.name}</DialogTitle></DialogHeader>
          <div className="h-full w-full relative">
            {previewFile && (previewFile.name.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? <Image src={previewFile.url} alt={previewFile.name} layout="fill" objectFit="contain" /> : <iframe src={previewFile.url} className="w-full h-full border-0" title={previewFile.name}></iframe>)}
          </div>
        </DialogContent>
      </Dialog>
      
       <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إعادة تسمية</DialogTitle></DialogHeader>
          <Input value={newFileName} onChange={(e) => setNewFileName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRenameFile()} />
          <DialogFooter><Button onClick={handleRenameFile}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
