/**
 * محتوى الصفحة الرئيسية (الموقع التعريفي). عدّل هنا وتتحدث الصفحة كلها.
 */
export const PROFILE = {
  name: "أحمد الحربي",
  fullName: "أحمد نشمي الحربي",
  nameEn: "Ahmed Alharbi",
  role: "إدارة أعمال · تشغيل صحي · منتجات رقمية",
  intro: "أبني منتجات رقمية عملية، وأصنع تجارب تشغيل أفضل.",
  introEn: "Building practical digital products and better operational experiences.",
  city: "السعودية",
  available: true,

  projects: [
    {
      title: "مرشح",
      titleEn: "Mershhah",
      label: "المشروع الأساسي",
      desc: "منصة عربية للمطاعم والمقاهي لإدارة المنيو الرقمي والفروع والعروض والتحليلات وتجربة العميل، مع خصائص تعتمد على الذكاء الاصطناعي.",
      points: ["منيو رقمي", "إدارة الفروع", "العروض", "التحليلات", "تجربة العميل", "ذكاء اصطناعي"],
      tags: ["SaaS", "AI"],
      link: "",
      bg: "bg-orange",
    },
    {
      title: "أتمتة التقديم على الوظائف",
      titleEn: "Job Application Automation",
      label: "منتج أطلقته وبعته",
      desc: "منتج يؤتمت عملية التقديم على الوظائف. بنيته وأطلقته، وحقق مبيعات فعلية.",
      points: ["أتمتة", "إطلاق وبيع", "مبيعات فعلية"],
      tags: ["Automation"],
      link: "",
      bg: "bg-sky",
    },
  ],

  about: [
    "درست بكالوريوس إدارة الأعمال تخصص الإدارة العامة، واشتغلت في أكثر من مجال قبل ما أستقر في الإدارة والتشغيل بالقطاع الصحي.",
    "شغلي اليومي علّمني إن أغلب المشاكل تنحل بإجراء أوضح وأداة أبسط. عشان كذا صرت أبني منتجات رقمية تحوّل المشكلات اليومية إلى حلول عملية، وأطلقها للناس فعلًا.",
  ],

  achievements: [
    { value: "٢×", label: "موظف الشهر، مرتين متتاليتين" },
    { value: "✓", label: "منتج رقمي أطلقته وحقق مبيعات فعلية" },
    { value: "SaaS", label: "منصة «مرشح» للمطاعم والمقاهي" },
  ],

  // Numbers and clients carried over from the old home page.
  impact: [
    {
      value: 30000,
      unit: "ريال سعودي",
      title: "مبيعات قياسية ونتائج ملموسة",
      desc: "عوائد حققتها من المشاريع والمتاجر اللي طورتها لعملائي. كل ريال هنا قصة نجاح وهدف تحقق.",
    },
    {
      value: 600,
      unit: "عميل سعيد",
      title: "شبكة عملاء واسعة ومتنوعة",
      desc: "أكثر من ٦٠٠ عميل وثقوا فيني: مشاريع فريدة، متاجر إلكترونية ناجحة، ومبادرات شخصية.",
    },
  ],

  clients: [
    { name: "عميل", logo: "https://res.cloudinary.com/dw5sydtj6/image/upload/v1758551493/JNHhOktm_400x400_vtd7y1.jpg" },
    { name: "بونيتا", logo: "https://res.cloudinary.com/dw5sydtj6/image/upload/v1758551813/%D8%A8%D9%88%D9%86%D9%8A%D8%AA%D8%A7_vtqnfm.png" },
    { name: "بازيليكو", logo: "/clients/basilico.png" },
    { name: "نفرات", logo: "/clients/nafarat.png" },
    { name: "البرجر الجميل", logo: "/clients/beautiful-burgers.png" },
  ],

  experience: [
    {
      period: "حاليًا",
      title: "الإدارة والتشغيل",
      place: "القطاع الصحي",
      points: [
        "خدمة المستفيدين وتنظيم المواعيد",
        "التأمين والموافقات والإحالات",
        "الإجراءات الصحية والتعامل مع الشكاوى",
        "التسويات والمتابعة باستخدام Excel",
        "تحسين الإجراءات وحل المشكلات التشغيلية",
      ],
    },
    { period: "", title: "بكالوريوس إدارة الأعمال", place: "الإدارة العامة", points: [] as string[] },
  ],

  skills: [
    { group: "الإدارة والتشغيل", items: ["إدارة العمليات", "Excel والتسويات", "تحليل المشكلات وتحسين الإجراءات", "خدمة العملاء", "إدارة المشاريع الصغيرة"] },
    { group: "المنتجات الرقمية", items: ["تصميم المنتجات الرقمية", "UI / UX", "أدوات الذكاء الاصطناعي", "بناء وأتمتة Workflows"] },
    { group: "الأدوات التقنية", items: ["React و Vite", "Supabase", "Vercel و Cloudflare", "واجهات الـ API"] },
  ],
  languages: [
    { name: "العربية", level: "اللغة الأم" },
    { name: "الإنجليزية", level: "أطوّرها وأستخدمها في بيئة العمل" },
  ],
  interests: ["SaaS", "الذكاء الاصطناعي", "الأتمتة", "تجربة المستخدم", "تحويل المشكلات اليومية إلى منتجات"],

  contact: {
    email: "hi@ahmedalharbi.com",
    links: [
      { label: "X", url: "https://x.com/ahmedalharbisa" },
      { label: "TikTok", url: "https://tiktok.com/@ahmedalharbisa" },
      { label: "GitHub", url: "https://github.com/ahmedtool" },
      { label: "صفحة روابطي", url: "/bio" },
    ],
  },
};
