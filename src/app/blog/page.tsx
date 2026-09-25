
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from 'next/link';
import Image from "next/image";
import { posts as staticPosts } from './posts';

export default function BlogListPage() {
  const logoUrl = "https://res.cloudinary.com/dw5sydtj6/image/upload/v1755563838/%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_imqtxp.png";

  return (
    <div className="bg-background text-foreground text-right min-h-screen">
        {/* Header */}
        <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Image src={logoUrl} alt="شعار أحمد الحربي" width={32} height={32} />
                <h1 className="text-lg font-bold">أحمد الحربي</h1>
            </div>
             <Button asChild variant="outline">
                <Link href="/">
                    <ArrowLeft className="ml-2 h-4 w-4" />
                    العودة للرئيسية
                </Link>
            </Button>
        </header>

        {/* Blog Section */}
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold">المدونة</h1>
                <p className="text-muted-foreground mt-2">أفكار، تجارب، وتحديثات أشاركها معكم.</p>
            </div>
            {staticPosts.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {staticPosts.map(post => (
                        <Card key={post.id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
                             <Link href={`/blog/${post.slug}`} passHref className="block">
                                {post.imageUrl && (
                                    <div className="relative w-full h-48">
                                            <Image src={post.imageUrl} alt={post.title} layout="fill" objectFit="cover" className="rounded-t-lg"/>
                                    </div>
                                )}
                            </Link>
                            <CardHeader>
                                <CardTitle>
                                    <Link href={`/blog/${post.slug}`} passHref className="hover:underline">
                                        {post.title}
                                    </Link>
                                </CardTitle>
                                <CardDescription>
                                    {post.date}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-muted-foreground line-clamp-3">{post.excerpt}</p>
                            </CardContent>
                            <CardFooter>
                                <Button asChild variant="secondary" className="w-full">
                                    <Link href={`/blog/${post.slug}`} passHref>
                                        اقرأ المزيد
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-16">
                    <p>لا توجد مقالات منشورة حاليًا. عد قريبًا!</p>
                </div>
            )}
        </main>

         {/* Footer */}
        <footer className="bg-muted/50 py-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} أحمد الحربي. جميع الحقوق محفوظة.</p>
            </div>
        </footer>
    </div>
  );
}
