
"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Users, ArrowLeft, TrendingUp } from "lucide-react";
import Link from 'next/link';
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import useClient from "@/hooks/use-client";

function AnimatedCounter({ value, duration = 2 }: { value: number, duration?: number }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    useEffect(() => {
        if (!isInView) return;

        const controls = {
            stop: () => {},
        };

        let animationFrame: number;
        const animate = (startTime: number | null = null) => {
            const currentTime = Date.now();
            if (startTime === null) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
            
            setCount(Math.floor(progress * value));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(() => animate(startTime));
                controls.stop = () => cancelAnimationFrame(animationFrame);
            }
        };

        animationFrame = requestAnimationFrame(() => animate());
        controls.stop = () => cancelAnimationFrame(animationFrame);

        return () => controls.stop();
    }, [isInView, value, duration]);

    return (
        <span ref={ref}>
            {new Intl.NumberFormat('ar-SA').format(count)}
        </span>
    );
}

export default function LandingPage() {
  const [logoUrl, setLogoUrl] = React.useState("https://res.cloudinary.com/dw5sydtj6/image/upload/v1755563838/%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_imqtxp.png");
  const isClient = useClient();
  
  return (
    <div className="bg-background text-foreground text-right">
        {/* Header */}
        <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Image src={logoUrl} alt="شعار أحمد الحربي" width={32} height={32} priority />
                <h1 className="text-lg font-bold">أحمد الحربي</h1>
            </div>
             <nav className="flex items-center gap-2">
                <Button asChild variant="outline" >
                    <Link href="/support/submit">
                      <Mail className="ml-2 h-4 w-4" />
                      تواصل معي
                    </Link>
                </Button>
            </nav>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center flex flex-col items-center justify-center">
            <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight"
            >
                شريكك الإبداعي والتقني
            </motion.h1>
            <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground"
            >
                أحوّل أفكارك لواقع رقمي. أقدم لك حلول مبتكرة في مجالات مختلفة عشان أساعدك تحقق أهدافك.
            </motion.p>
             <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-8"
            >
                <Button asChild size="lg">
                    <Link href="/support/submit">
                        ابدأ مشروعك معاي
                    </Link>
                </Button>
            </motion.div>
        </main>
        
        {/* Stats Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="space-y-16">
                 <motion.div 
                     initial={{ opacity: 0, x: 100 }}
                     whileInView={{ opacity: 1, x: 0 }}
                     transition={{ duration: 0.7, ease: "easeOut" }}
                     viewport={{ once: true }}
                     className="grid md:grid-cols-2 gap-12 items-center"
                 >
                     <div className="order-2 md:order-1">
                        <h3 className="text-2xl font-bold mb-4">مبيعات قياسية ونتائج ملموسة</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            الأرقام هي شهادة على الإنجاز. هذا المبلغ يمثل العوائد المالية التي حققتها، كأحمد الحربي، من خلال المشاريع والمتاجر التي طورتها لعملائي. كل ريال هنا هو قصة نجاح وهدف تحقق.
                        </p>
                    </div>
                    <div className="text-center order-1 md:order-2">
                        <p className="text-7xl md:text-9xl font-extrabold text-primary">
                           {isClient ? <AnimatedCounter value={30000} /> : '30,000+'}
                        </p>
                         <p className="text-xl text-muted-foreground mt-2">ريال سعودي</p>
                    </div>
                 </motion.div>

                 <motion.div 
                     initial={{ opacity: 0, x: -100 }}
                     whileInView={{ opacity: 1, x: 0 }}
                     transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
                     viewport={{ once: true }}
                     className="grid md:grid-cols-2 gap-12 items-center"
                 >
                    <div className="order-2 md:order-2">
                        <h3 className="text-2xl font-bold mb-4">أخدم شبكة عملاء واسعة ومتنوعة</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            أفخر بخدمة أكثر من 600 عميل، وهذي شهادة على الثقة والنجاح المشترك. هذي الشراكات هي نتاج شغل جامد في تطوير مشاريع فريدة، وإطلاق متاجر إلكترونية ناجحة، وتنفيذ مبادرات شخصية مبتكرة. كل عميل هو جزء من قصة نجاحي.
                        </p>
                    </div>
                    <div className="text-center order-1 md:order-1">
                        <p className="text-7xl md:text-9xl font-extrabold text-primary">
                            {isClient ? <AnimatedCounter value={600} /> : '600+'}
                        </p>
                        <p className="text-xl text-muted-foreground mt-2">عميل سعيد</p>
                    </div>
                 </motion.div>
            </div>
        </section>

        {/* Clients Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
             <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                viewport={{ once: true }}
                className="bg-muted/50 rounded-2xl p-8 md:p-12"
            >
                <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                        <h2 className="text-3xl font-bold">انضم لقائمة عملائي المميزين</h2>
                        <p className="text-muted-foreground">
                            أنا ما أبني مشاريع وبس، أنا أبني شراكات نجاح. خلّك عميلي الجاي اللي أحتفل بقصته.
                        </p>
                        <Button asChild size="lg">
                           <Link href="/support/submit">
                                كن عميلي التالي
                                <ArrowLeft className="mr-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                    <div className="flex justify-center md:justify-end items-center -space-x-8 rtl:space-x-reverse">
                         <Image
                            data-ai-hint="logo abstract"
                            className="w-24 h-24 rounded-full object-cover border-4 border-background shadow-lg"
                            src="https://res.cloudinary.com/dw5sydtj6/image/upload/v1758551493/JNHhOktm_400x400_vtd7y1.jpg"
                            alt="عميل 1"
                            width={96}
                            height={96}
                        />
                        <Image
                            data-ai-hint="logo modern"
                            className="w-28 h-28 rounded-full object-cover border-4 border-background shadow-lg z-10"
                             src="https://res.cloudinary.com/dw5sydtj6/image/upload/v1758551813/%D8%A8%D9%88%D9%86%D9%8A%D8%AA%D8%A7_vtqnfm.png"
                            alt="شعار بونيتا"
                            width={112}
                            height={112}
                        />
                         <Image
                            data-ai-hint="logo minimal"
                            className="w-24 h-24 rounded-full object-cover border-4 border-background shadow-lg"
                             src="https://res.cloudinary.com/dw5sydtj6/image/upload/v1758552110/%D8%A8%D8%A7%D9%86%D8%AF%D8%A7_w3rd0e.png"
                            alt="شعار باندا"
                            width={96}
                            height={96}
                        />
                    </div>
                </div>
            </motion.div>
        </section>


         {/* Footer */}
        <footer className="py-8 container mx-auto px-4 sm:px-6 lg:px-8">
             <div className="bg-card text-card-foreground rounded-2xl p-8 md:p-12 text-center space-y-6 shadow-lg border">
                <h2 className="text-3xl font-bold">عندك فكرة مشروع؟</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                    لا تتردد بالتواصل معي، أنا هنا لمساعدتك على تحويلها إلى واقع.
                </p>
                <Button size="lg" asChild>
                    <Link href="/support/submit">
                        <Mail className="ml-2 h-4 w-4" />
                        تواصل معي الآن
                    </Link>
                </Button>
            </div>
            <div className="text-center text-sm text-muted-foreground pt-8">
                <p>&copy; {new Date().getFullYear()} أحمد الحربي. جميع الحقوق محفوظة.</p>
            </div>
        </footer>
    </div>
  );
}
