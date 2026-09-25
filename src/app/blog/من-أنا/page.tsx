
import React from 'react';
import Image from 'next/image';
import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ShareButtons } from './share-buttons';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

// SEO Metadata
export const metadata: Metadata = {
  title: 'من أنا | أحمد الحربي',
  description: 'أنا أحمد الحربي، إنسان شغوف بالتقنية وبالأفكار التي تغيّر طريقة نظرنا للعالم. تعرف على قصتي ورحلتي في عالم التقنية والإبداع.',
  openGraph: {
    title: 'من أنا | أحمد الحربي',
    description: 'تعرف على قصتي ورحلتي في عالم التقنية والإبداع.',
    images: [
      {
        url: 'https://res.cloudinary.com/dw5sydtj6/image/upload/v1758986802/%D9%85%D9%86_%D8%A3%D9%86%D8%A7_%D9%85%D9%82%D8%A7%D9%84%D8%A9_%D8%AA%D8%B9%D8%B1%D9%8A%D9%81%D9%8A%D8%A9_%D8%B9%D9%86_%D8%A3%D8%AD%D9%85%D8%AF_%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_%D9%85%D8%AF%D9%88%D9%86%D8%A9_%D8%A7%D8%AD%D9%85%D8%AF_%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_%D9%85%D8%B7%D9%88%D8%B1_%D8%A7%D8%B9%D9%85%D8%A7%D9%84_%D9%88%D9%85%D9%87%D8%AA%D9%85_%D8%A8%D8%A7%D9%84%D8%B0%D9%83%D8%A7%D8%A1_%D8%A7%D9%84%D8%A7%D8%B5%D8%B7%D9%86%D8%A7%D8%B9%D9%8A_%D8%B7%D9%88%D8%B1%D8%AA_%D8%A7%D9%86%D8%B8%D9%85%D8%A9_%D9%83%D8%AB%D9%8A%D8%B1%D8%A9_%D9%88%D8%B9%D8%AF%D9%8A%D8%AF%D9%8A%D8%A9_yqynep.gif',
        width: 1200,
        height: 630,
        alt: 'من أنا - أحمد الحربي',
      },
    ],
    type: 'article',
  },
};

const otherPosts = [
    {
        id: "2",
        title: "أفضل 5 أدوات للمطورين في 2024",
        slug: "/blog/top-5-tools",
        imageUrl: "https://picsum.photos/seed/post2/400/200",
        excerpt: "استعراض لأهم الأدوات التي لا أستغني عنها في عملي اليومي كمطور ويب، من محررات الأكواد إلى خدمات النشر.",
    },
];

export default function WhoAmIPage() {
  const logoUrl = "https://res.cloudinary.com/dw5sydtj6/image/upload/v1755563838/%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_imqtxp.png";
  const imageUrl = "https://res.cloudinary.com/dw5sydtj6/image/upload/v1758986802/%D9%85%D9%86_%D8%A3%D9%86%D8%A7_%D9%85%D9%82%D8%A7%D9%84%D8%A9_%D8%AA%D8%B9%D8%B1%D9%8A%D9%81%D9%8A%D8%A9_%D8%B9%D9%86_%D8%A3%D8%AD%D9%85%D8%AF_%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_%D9%85%D8%AF%D9%88%D9%86%D8%A9_%D8%A7%D8%AD%D9%85%D8%AF_%D8%A7%D9%84%D8%AD%D8%B1%D9%8A_%D9%85%D8%B7%D9%88%D8%B1_%D8%A7%D8%B9%D9%85%D8%A7%D9%84_%D9%88%D9%85%D9%87%D8%AA%D9%85_%D8%A8%D8%A7%D9%84%D8%B0%D9%83%D8%A7%D8%A1_%D8%A7%D9%84%D8%A7%D8%B5%D8%B7%D9%86%D8%A7%D8%B9%D9%8A_%D8%B7%D9%88%D8%B1%D8%AA_%D8%A7%D9%86%D8%B8%D9%85%D8%A9_%D9%83%D8%AB%D9%8A%D8%B1%D8%A9_%D9%88%D8%B9%D8%AF%D9%8A%D8%AF%D9%8A%D8%A9_yqynep.gif";
  const tags = ["تقنية", "ريادة أعمال", "تطوير الذات", "قصة شخصية"];

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
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">✨ أنا أحمد الحربي</h1>
            <div className="mt-4 flex justify-center gap-2 flex-wrap">
                {tags.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
            </div>
          </header>

          {imageUrl && (
            <div className="relative w-full h-64 sm:h-80 md:h-96 mb-8 rounded-lg overflow-hidden shadow-lg">
              <Image src={imageUrl} alt="من أنا" layout="fill" objectFit="cover" priority />
            </div>
          )}

          <div className="prose prose-lg max-w-none text-foreground/90 mx-auto text-justify leading-relaxed space-y-6">
            <p>
              أنا أحمد الحربي، إنسان شغوف بالتقنية وبالأفكار التي تغيّر طريقة نظرنا للعالم. لم أتعامل مع التقنية كأدوات فقط، بل كأبواب جديدة تفتح لي طرقًا للتجربة والاكتشاف والتعبير. منذ سنواتي الأولى كنت أنظر إلى الإنترنت كأكثر من مجرد وسيلة للتواصل، بل كمساحة يمكن أن تُبنى فيها مشاريع، تُكتب فيها قصص، وتُخلق فيها فرص غير محدودة. كنت وما زلت أؤمن أن لكل فكرة صوت، وأن دوري أن أساعدها لتخرج إلى النور.
            </p>
            <p>
              كتبت مقالات، جربت مشاريع، وصممت مسارات لأفكار لم يكن يصدق أحد أنها ممكنة. كنت أتعلم من الفشل بقدر ما أتعلم من النجاح، وأدركت أن كل خطوة، مهما كانت بسيطة، يمكن أن تكون بداية لمسار طويل مليء بالإبداع. بالنسبة لي، التقنية ليست مجرد لغة كود أو أزرار في شاشة؛ التقنية هي لغة الإنسان في عصره الحديث، وسلاحه ليعبّر عن ذاته ويترك أثره في هذا العالم.
            </p>
            <p>
              مدونتي هي مساحة شخصية لكنها ليست لي وحدي. كتبتها لتكون بيتًا لكل من يبحث عن فكرة، عن إلهام، عن معرفة، أو حتى عن قصة تذكّره أن الشغف ما زال حيًا. هنا تجد جزءًا من رحلتي، وتأملاتي حول المشاريع الرقمية، والمحتوى، والتحولات التي تصنعها التقنية في حياتنا اليومية. كل مقال هو انعكاس لتجربة أو تساؤل أو محاولة لفهم أعمق لما يجري حولنا.
            </p>
            <p>
              أنا لا أعد بالكمال ولا أقدّم وصفات جاهزة، لكنني أقدّم شيئًا أؤمن به: الصدق في مشاركة المعرفة. أؤمن أن الكلمات قد تبدو بسيطة، لكنها قادرة على أن تترك أثرًا يتجاوز المسافات. وكل سطر تراه هنا كُتب بنيّة أن يفتح نافذة جديدة لك، أو أن يمنحك دفعة صغيرة نحو مشروعك القادم، أو حتى أن يجعلك ترى الأمور من زاوية مختلفة.
            </p>
            <p>
              في النهاية، أنا أحمد الحربي، أكتب لأني لا أستطيع التوقف عن الكتابة، وأبني لأنني أجد متعة في تحويل الفكرة إلى واقع. رحلتي ما زالت في بدايتها، لكنني متأكد أن كل خطوة فيها تستحق أن تُحكى، وكل قصة تستحق أن تُشارك. وهذه المساحة هي قصتي التي أهديها إليك، علّها تلامس شيئًا في داخلك وتذكّرك أن لكل واحد منا قدرة على الإبداع والإنجاز.
            </p>
          </div>

           {/* Share buttons */}
          <div className="mt-12 text-center">
            <p className="font-bold mb-4">شارك المقال مع أصدقائك:</p>
            <ShareButtons title="من أنا | رحلة شغف في عالم التقنية" />
          </div>

        </article>

        {/* Other articles */}
        <section className="mt-20">
             <h2 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-2">📖 مقالات أخرى قد تعجبك</h2>
             <div className="max-w-2xl mx-auto">
                 {otherPosts.map(post => (
                     <Card key={post.id} className="hover:shadow-lg transition-shadow">
                         <div className="grid md:grid-cols-3 gap-0">
                             <div className="md:col-span-1 relative min-h-[150px] md:min-h-full">
                                 <Image src={post.imageUrl} alt={post.title} layout="fill" objectFit="cover" className="rounded-t-lg md:rounded-r-lg md:rounded-l-none"/>
                             </div>
                             <div className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle>
                                        <Link href={post.slug} passHref className="hover:underline">
                                            {post.title}
                                        </Link>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground line-clamp-2">{post.excerpt}</p>
                                </CardContent>
                                 <CardFooter>
                                    <Button asChild variant="secondary">
                                        <Link href={post.slug} passHref>
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
