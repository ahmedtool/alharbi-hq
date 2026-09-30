
"use client";

import React, { useState, useEffect } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { PublicShell } from '@/components/app/public-shell';
import { logoAt } from '@/lib/brand';
import { db } from '@/lib/db';
import { collection, query, where, getDocs, limit } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

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

const GitHubIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
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
        { platform: 'x', url: 'https://x.com/ahmedsupsa' },
        { platform: 'tiktok', url: 'https://www.tiktok.com/@ahmedsupsa' },
        { platform: 'github', url: 'https://github.com/ahmedsupsa' },
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

    const socialLabel: Record<string, string> = { x: 'X', tiktok: 'TikTok', github: 'GitHub', whatsapp: 'واتساب', email: 'الإيميل' };
    const links = [
        { label: 'موقعي الشخصي', hint: 'نبذة وأعمالي', href: '/' },
        { label: 'اطلب مشروع', hint: 'أرسل طلبك وأرد عليك', href: '/support/submit' },
    ];

    return (
        <PublicShell active="bio">
            <div className="pf pf-bar bio">
                <div className="container bio-wrap">
                    {/* الرأس */}
                    <header className="bio-head">
                        <img className="bio-logo bio-in" style={{ ['--d' as string]: 0 }} src={logoAt(192)} alt={`شعار ${pageData.name}`} width={88} height={88} />
                        <div className="eyebrow bio-in" style={{ ['--d' as string]: 1 }} lang="en">Ahmed Alharbi</div>
                        <h1 className="bio-in" style={{ ['--d' as string]: 2 }}>{pageData.name}</h1>
                        <p className="bio-in" style={{ ['--d' as string]: 3 }}>{pageData.bio}</p>
                    </header>

                    {/* الوصول بالرقم */}
                    <section className="bio-block bio-in" style={{ ['--d' as string]: 4 }}>
                        <div className="sec-head bio-rule"><div><div className="eyebrow">٠١</div><h2>الوصول بالرقم</h2></div><p>اكتب الرقم اللي شفته في المقطع</p></div>
                        <form onSubmit={handleSearch} className="bio-form">
                            <label className="bio-field bio-field-num">
                                <span>#</span>
                                <input inputMode="numeric" placeholder="الرقم، مثلًا ٢٣٩" value={searchNumber}
                                    onChange={(e) => setSearchSearchNumber(e.target.value)} disabled={isSearching} aria-label="الرقم" />
                            </label>
                            <button type="submit" className="btn btn-primary" disabled={isSearching || !searchNumber.trim()}>
                                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : null} بحث
                            </button>
                        </form>

                        {hasSearched && searchResult && (
                            <div className="bio-result">
                                <span className="bio-result-num">{searchResult.number}</span>
                                <div className="bio-result-body">
                                    <h3>{searchResult.title}</h3>
                                    {searchResult.description && <p>{searchResult.description}</p>}
                                    <div className="bio-result-actions">
                                        <a className="btn btn-primary" href={searchResult.url} target="_blank" rel="noopener noreferrer">
                                            {searchResult.type === 'file' ? 'تحميل' : 'فتح'} ↗
                                        </a>
                                        <button type="button" className="btn btn-ghost" onClick={resetSearch}>بحث عن رقم آخر</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* الروابط */}
                    <section className="bio-block bio-in" style={{ ['--d' as string]: 5 }}>
                        <div className="sec-head bio-rule"><div><div className="eyebrow">٠٢</div><h2>روابطي</h2></div></div>
                        <ul className="bio-links">
                            {links.map((l) => (
                                <li key={l.href}><a href={l.href}><span><b>{l.label}</b><small>{l.hint}</small></span><i aria-hidden="true">↖</i></a></li>
                            ))}
                            {pageData.socials.map((social) => (
                                <li key={social.platform}>
                                    <a href={social.url} {...(social.url.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" })} aria-label={social.url === "/" ? `${socialLabel[social.platform] ?? social.platform}: موقعي الشخصي` : `تواصل معي عبر ${socialLabel[social.platform] ?? social.platform}`}>
                                        <span className="bio-social">
                                            <em>
                                                {social.platform === 'x' && <XIcon />}
                                                {social.platform === 'tiktok' && <TikTokIcon />}
                                                {social.platform === 'github' && <GitHubIcon />}
                                                {social.platform === 'whatsapp' && <WhatsAppIcon />}
                                                {social.platform === 'email' && <Mail />}
                                            </em>
                                            <b>{socialLabel[social.platform] ?? social.platform}</b>
                                        </span>
                                        <i aria-hidden="true">↖</i>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            </div>
        </PublicShell>
    );
}
