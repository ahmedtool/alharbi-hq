
import React from 'react';
import Image from 'next/image';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ShareButtons } from './share-buttons';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { posts } from '../posts';

// This function generates the static pages for each blog post at build time.
export async function generateStaticParams() {
  return posts.map(post => ({
    slug: post.slug,
  }));
}

// This function generates metadata for each post dynamically.
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const decodedSlug = decodeURIComponent(params.slug);
  const post = posts.find(p => p.slug === decodedSlug);

  if (!post) {
    return {
      title: 'المقال غير موجود',
    };
  }

  return {
    title: `${post.title} | أحمد الحربي`,
    description: post.excerpt,
    openGraph: {
      title: `${post.title} | أحمد الحربي`,
      description: post.excerpt,
      images: [
        {
          url: post.imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      type: 'article',
    },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const logoUrl = "https://res.cloudinary.com/dw5sydtj6/image/upload/v1755563838/%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_imqtxp.png";
  
  // Decode the slug from the URL (e.g., from %D9%85%D9%86-%D8%A3%D9%86%D8%A7 to من-أنا)
  const decodedSlug = decodeURIComponent(params.slug);
  const post = posts.find(p => p.slug === decodedSlug);

  // If no post is found for the slug, show a 404 page.
  if (!post) {
    notFound();
  }

  const otherPosts = posts.filter(p => p.id !== post.id);

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <Image src={logoUrl} alt="شعار أحمد الحربي" width={32} height={32} />
            <h1 className="text-lg font-bold">أحمد الحربي</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/blog">
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة للمدونة
          </Link>
        </Button>
      </header>

      {/* Article */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="max-w-3xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{post.title}</h1>
            <div className="mt-4 flex justify-center gap-2 flex-wrap">
                {post.tags.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
            </div>
          </header>

          {post.imageUrl && (
            <div className="relative w-full h-64 sm:h-80 md:h-96 mb-8 rounded-lg overflow-hidden shadow-lg">
              <Image src={post.imageUrl} alt={post.title} layout="fill" objectFit="cover" priority />
            </div>
          )}

          <div 
            className="prose prose-lg max-w-none text-foreground/90 mx-auto text-justify leading-relaxed space-y-6"
            dangerouslySetInnerHTML={{ __html: post.contentHTML }}
          />

           {/* Share buttons */}
          <div className="mt-12 text-center">
            <p className="font-bold mb-4">شارك المقال مع أصدقائك:</p>
            <ShareButtons title={post.title} />
          </div>

        </article>

        {/* Other articles */}
        {otherPosts.length > 0 && (
          <section className="mt-20">
             <h2 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-2">📖 مقالات أخرى قد تعجبك</h2>
             <div className="max-w-2xl mx-auto">
                 {otherPosts.map(p => (
                     <Card key={p.id} className="hover:shadow-lg transition-shadow">
                         <div className="grid md:grid-cols-3 gap-0">
                             <div className="md:col-span-1 relative min-h-[150px] md:min-h-full">
                                 <Image src={p.imageUrl} alt={p.title} layout="fill" objectFit="cover" className="rounded-t-lg md:rounded-r-lg md:rounded-l-none"/>
                             </div>
                             <div className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle>
                                        <Link href={`/blog/${p.slug}`} passHref className="hover:underline">
                                            {p.title}
                                        </Link>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground line-clamp-2">{p.excerpt}</p>
                                </CardContent>
                                 <CardFooter>
                                    <Button asChild variant="secondary">
                                        <Link href={`/blog/${p.slug}`} passHref>
                                            اقرأ المزيد
                                        </Link>
                                    </Button>
                                </CardFooter>
                             </div>
                         </div>
                     </Card>
                 ))}
             </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 py-8 mt-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} أحمد الحربي. جميع الحقوق محفوظة.</p>
          </div>
      </footer>
    </div>
  );
}
