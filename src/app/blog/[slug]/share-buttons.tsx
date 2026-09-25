
"use client";

import React from 'react';
import { Twitter, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Inline SVG for WhatsApp as it's not in lucide-react
const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
);


export function ShareButtons({ title }: { title: string }) {
    const { toast } = useToast();
    const [pageUrl, setPageUrl] = React.useState('');

    React.useEffect(() => {
        // This runs only on the client, so window is available
        setPageUrl(window.location.href);
    }, []);

    const encodedUrl = encodeURIComponent(pageUrl);
    const encodedTitle = encodeURIComponent(title);

    const handleCopy = () => {
        navigator.clipboard.writeText(pageUrl);
        toast({ title: "تم نسخ رابط المقال بنجاح!" });
    };

    return (
        <div className="flex justify-center gap-2">
            <Button variant="outline" asChild>
                <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`} target="_blank" rel="noopener noreferrer">
                    <Twitter className="ml-2" />
                    شارك على تويتر
                </a>
            </Button>
            <Button variant="outline" asChild>
                <a href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon />
                    <span className="mr-2">شارك على واتساب</span>
                </a>
            </Button>
            <Button variant="outline" onClick={handleCopy}>
                <Copy className="ml-2" />
                نسخ الرابط
            </Button>
        </div>
    );
}
