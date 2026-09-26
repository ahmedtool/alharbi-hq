
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Mail, Link as LinkIcon, Search, Hash, Loader2, ArrowLeft, ExternalLink, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/db';
import { collection, query, where, getDocs, limit } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Helper function to convert Arabic-Indic digits (١٢٣) to English digits (123)
const toEnglishDigits = (str: string) => {
    const chars: { [key: string]: string } = {
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
        '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
    };
    return str.replace(/[٠-٩]/g, (d) => chars[d]);
};

// SVG Icons for TikTok, X, and WhatsApp
const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 30 30" fill="currentColor">
        <path d="M 6 4 C 4.895 4 4 4.895 4 6 L 4 24 C 4 25.105 4.895 26 6 26 L 24 26 C 25.105 26 26 25.105 26 24 L 26 6 C 26 4.895 25.105 4 24 4 L 6 4 z M 8.6484375 9 L 13.259766 9 L 15.951172 12.847656 L 19.28125 9 L 20.732422 9 L 16.603516 13.78125 L 21.654297 21 L 17.042969 21 L 14.056641 16.730469 L 10.369141 21 L 8.8945312 21 L 13.400391 15.794922 L 8.6484375 9 z M 10.878906 10.183594 L 17.632812 19.810547 L 19.421875 19.810547 L 12.666016 10.183594 L 10.878906 10.183594 z"></path>
    </svg>
);

const TikTokIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 50 50" fill="currentColor">
        <path d="M41,4H9C6.243,4,4,6.243,4,9v32c0,2.757,2.243,5,5,5h32c2.757,0,5-2.243,5-5V9C46,6.243,43.757,4,41,4z M37.006,22.323 c-0.227,0.021-0.457,0.035-0.69,0.035c-2.623,0-4.928-1.349-6.269-3.388c0,5.349,0,11.435,0,11.537c0,4.709-3.818,8.527-8.527,8.527 s-8.527-3.818-8.527-8.527s3.818-8.527,8.527-8.527c0.178,0,0.352,0.016,0.527,0.027v4.202c-0.175-0.021-0.347-0.053-0.527-0.053 c-2.404,0-4.352,1.948-4.352,4.352s1.948,4.352,4.352,4.352s4.527-1.894,4.527-4.298c0-0.095,0.042-19.594,0.042-19.594h4.016 c0.378,3.591,3.277,6.425,6.901,6.685V22.323z"></path>
    </svg>
);

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
        <path fill="#40c351" d="M35.176,12.832c-2.98-2.982-6.941-4.625-11.157-4.626c-8.704,0-15.783,7.076-15.787,15.774c-0.001,2.981,0.833,5.883,2.413,8.396l0.376,0.597l-1.595,5.821l5.973-1.566l0.577,0.342c2.422,1.438,5.2,2.198,8.032,2.199h0.006c8.698,0,15.777-7.077,15.78-15.776C39.795,19.778,38.156,15.814,35.176,12.832z"></path><path fill="#fff" fillRule="evenodd" d="M19.268,16.045c-0.355-0.79-0.729-0.806-1.068-0.82c-0.277-0.012-0.593-0.011-0.909-0.011c-0.316,0-0.83,0.119-1.265,0.594c-0.435,0.475-1.661,1.622-1.661,3.956c0,2.334,1.7,4.59,1.937,4.906c0.237,0.316,3.282,5.259,8.104,7.161c4.007,1.58,4.823,1.266,5.693,1.187c0.87-0.079,2.807-1.147,3.202-2.255c0.395-1.108,0.395-2.057,0.277-2.255c-0.119-0.198-0.435-0.316-0.909-0.554s-2.807-1.385-3.242-1.543c-0.435-0.158-0.751-0.237-1.068,0.238c-0.316,0.474-1.225,1.543-1.502,1.859c-0.277,0.317-0.554,0.357-1.028,0.119c-0.474-0.238-2.002-0.738-3.815-2.354c-1.41-1.257-2.362-2.81-2.639-3.285c-0.277-0.474-0.03-0.731,0.208-0.968c0.213-0.213,0.474-0.554,0.712-0.831c0.237-0.277,0.316-0.475,0.474-0.791c0.158-0.317,0.079-0.594-0.04-0.831C20.612,19.329,19.69,16.983,19.268,16.045z" clipRule="evenodd"></path>
    </svg>
);

const pageData = {
    name: "أحمد الحربي",
    bio: "أصنع أدوات تقنية بسيطة 👨‍💻\nوأشارك مواقع وتجارب في الذكاء الاصطناعي 🤖",
    logoUrl: "https://res.cloudinary.com/dw5sydtj6/image/upload/v1755563838/%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_imqtxp.png",
    socials: [
        { platform: 'x', url: 'https://x.com/ahmedalharbisa' },
        { platform: 'tiktok', url: 'https://tiktok.com/@ahmedalharbisa' },
        { platform: 'whatsapp', url: 'https://wa.me/966560766880' },
        { platform: 'email', url: 'mailto:hi@ahmedalharbi.com' },
    ]
};

interface NumberedLink {
    id: string;
    number: string;
    title: string;
    description: string;
    url: string;
    type: 'link' | 'tool' | 'file';
}

export default function BioPage() {
    const { toast } = useToast();
    const [searchNumber, setSearchSearchNumber] = useState('');
    const [userName, setUserName] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<NumberedLink | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchNumber.trim()) return;

        setIsSearching(true);
        setHasSearched(false);
        setSearchResult(null);

        // تحويل الأرقام المدخلة إلى الصيغة الإنجليزية للبحث في قاعدة البيانات
        const normalizedNumber = toEnglishDigits(searchNumber.trim());

        try {
            const q = query(
                collection(db, "numbered_links"), 
                where("number", "==", normalizedNumber),
                limit(1)
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                setSearchResult({ id: doc.id, ...doc.data() } as NumberedLink);
            } else {
                toast({ variant: 'destructive', title: 'رقم غير موجود', description: 'تأكد من كتابة الرقم بشكل صحيح.' });
            }
            setHasSearched(true);
        } catch (error) {
            console.error("Search error:", error);
            toast({ variant: 'destructive', title: 'خطأ في البحث' });
        } finally {
            setIsSearching(false);
        }
    };

    const resetSearch = () => {
        setSearchSearchNumber('');
        setSearchResult(null);
        setHasSearched(false);
    }

    return (
        <div className="container mx-auto px-4 py-12 sm:py-16 max-w-2xl">
            {/* Header */}
            <header className="flex flex-col items-center text-center mb-10">
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <Image
                        src={pageData.logoUrl}
                        alt={`شعار ${pageData.name}`}
                        width={96}
                        height={96}
                        className="rounded-full border-4 border-background shadow-lg mb-4"
                        priority
                    />
                </motion.div>
                <h1 className="text-3xl font-bold">{pageData.name}</h1>
                <p className="text-muted-foreground mt-2 max-w-md whitespace-pre-line">{pageData.bio}</p>
            </header>

            {/* Numbered Access Search */}
            <section className="mb-12">
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="flex items-center justify-center gap-2">
                            <Hash className="h-5 w-5 text-primary" /> الوصول بالرقم
                        </CardTitle>
                        <CardDescription>اكتب الرقم اللي شفته في المقطع للوصول السريع</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative flex-1">
                                    <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="الرقم (مثلاً: ٢٣٩)" 
                                        className="pr-10 text-center font-bold text-lg" 
                                        value={searchNumber}
                                        onChange={(e) => setSearchSearchNumber(e.target.value)}
                                        disabled={isSearching}
                                    />
                                </div>
                                <div className="relative flex-1">
                                    <Input 
                                        placeholder="اسمك (اختياري)" 
                                        className="text-center" 
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        disabled={isSearching}
                                    />
                                </div>
                                <Button type="submit" disabled={isSearching || !searchNumber.trim()} className="w-full sm:w-auto">
                                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 ml-2" />}
                                    بحث
                                </Button>
                            </div>
                        </form>

                        <AnimatePresence>
                            {hasSearched && searchResult && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }} 
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-6 p-4 bg-background border rounded-lg shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">رقم {searchResult.number}</span>
                                                <h3 className="font-bold text-right">{searchResult.title}</h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground text-right">{searchResult.description}</p>
                                        </div>
                                        <Button asChild size="sm">
                                            <a href={searchResult.url} target="_blank" rel="noopener noreferrer">
                                                {searchResult.type === 'file' ? <Download className="h-4 w-4 ml-2"/> : <ExternalLink className="h-4 w-4 ml-2" />}
                                                {searchResult.type === 'file' ? 'تحميل' : 'فتح'}
                                            </a>
                                        </Button>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={resetSearch} className="mt-4 w-full text-xs text-muted-foreground">
                                        بحث عن رقم آخر
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>
                </Card>
            </section>

            {/* Links */}
            <section className="mb-12">
                <h2 className="font-bold text-center text-xl mb-6">✨ بصماتي الرقمية</h2>
                <div className="flex flex-col gap-4">
                    <a href="/" className="group block">
                        <Card className="hover:bg-muted/80 transition-colors">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="bg-muted p-3 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <LinkIcon className="h-6 w-6" />
                                </div>
                                <span className="font-semibold text-lg">موقعي الشخصي</span>
                            </CardContent>
                        </Card>
                    </a>
                    <a href="/support/submit" className="group block">
                        <Card className="hover:bg-muted/80 transition-colors">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="bg-muted p-3 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <Mail className="h-6 w-6" />
                                </div>
                                <span className="font-semibold text-lg">تواصل معي لطلب مشروع</span>
                            </CardContent>
                        </Card>
                    </a>
                </div>
            </section>
            
            {/* Social Icons */}
            <footer className="pt-8 border-t">
                <h3 className="text-center font-semibold mb-4">للتواصل المباشر</h3>
                <div className="flex justify-center gap-4">
                    {pageData.socials.map((social) => (
                        <Button key={social.platform} asChild variant="secondary" size="icon" className="h-16 w-16 rounded-full text-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                            <a href={social.url} target="_blank" rel="noopener noreferrer" aria-label={`تواصل معي عبر ${social.platform}`}>
                                {social.platform === 'x' && <XIcon />}
                                {social.platform === 'tiktok' && <TikTokIcon />}
                                {social.platform === 'whatsapp' && <WhatsAppIcon />}
                                {social.platform === 'email' && <Mail />}
                            </a>
                        </Button>
                    ))}
                </div>
            </footer>
        </div>
    );
}
