/**
 * محتوى الصفحة الرئيسية (الموقع التعريفي). عدّل هنا وتتحدث الصفحة كلها.
 */
export const PROFILE = {
  name: "أحمد الحربي",
  fullName: "أحمد نشمي الحربي",
  nameEn: "Ahmed Alharbi",
  role: "العمليات والتحول الرقمي",
  roleEn: "Digital Operations & Transformation",
  intro: "أفهم العملية، أكتشف المشكلة، وأحوّلها لحل رقمي.",
  introEn: "Bridging business operations, technology, and digital products.",
  city: "السعودية",
  available: true,

  // Each project is told as: operational problem -> solution -> result.
  projects: [
    {
      title: "مرشح",
      titleEn: "Mershhah",
      logo: "/projects/mershhah.jpg",
      tagline: "منيو رقمي وإدارة مطعمك في مكان واحد",
      label: "المشروع الأساسي",
      problem: "المطاعم والمقاهي تدير المنيو والفروع والعروض بأدوات متفرقة، وما عندها صورة واضحة عن أدائها وتجربة عملائها.",
      solution: "منصة SaaS عربية تجمع المنيو الرقمي وإدارة الفروع والعروض والتحليلات في مكان واحد، مع خصائص بالذكاء الاصطناعي.",
      result: "نظام تشغيل واحد للمطعم بدل أدوات مشتتة، وبيانات تساعد صاحب المطعم يقرر.",
      points: ["منيو رقمي", "إدارة الفروع", "العروض", "التحليلات", "تجربة العميل", "ذكاء اصطناعي"],
      tags: ["SaaS", "AI", "Operations"],
      link: "https://www.mershhah.com/",
      bg: "bg-orange",
    },
    {
      title: "أتمتة التقديم على الوظائف",
      titleEn: "JobBots",
      logo: "/projects/jobbots.png",
      tagline: "قدّم على الوظائف بضغطة زر",
      brand: "JobBots",
      label: "منتج أطلقته وبعته",
      problem: "التقديم على الوظائف عملية يدوية متكررة تاخذ ساعات: نفس البيانات، نفس الخطوات، في كل مرة.",
      solution: "أداة تؤتمت خطوات التقديم من البداية للنهاية.",
      result: "وقت أقل وتقديمات أكثر، وأطلقته كمنتج وحقق مبيعات فعلية.",
      points: ["أتمتة", "إطلاق وبيع", "مبيعات فعلية"],
      tags: ["Automation"],
      link: "https://www.jobbots.org/",
      bg: "bg-sky",
    },
    {
      title: "نظام التشغيل الشخصي",
      titleEn: "Personal Operations System",
      label: "أستخدمه كل يوم",
      problem: "المهام والمشاريع والعملاء والفواتير والملفات موزعة بين تطبيقات كثيرة، وصعب تتابعها كلها.",
      solution: "لوحة تحكم بنيتها بنفسي تجمع المهام والمشاريع والعملاء والمالية والفواتير والعقود ومساعد ذكي، فوق قاعدة بيانات واحدة.",
      result: "كل شغلي في مكان واحد، وهذا الموقع نفسه جزء منه.",
      points: ["المهام والمشاريع", "العملاء", "المالية والفواتير", "العقود", "مساعد ذكي"],
      tags: ["Next.js", "Supabase", "AI"],
      link: "",
      bg: "bg-mint",
    },
  ],

  about: [
    "خريج إدارة أعمال (إدارة عامة)، أشتغل في الإدارة والتشغيل وأتعامل كل يوم مع عمليات حقيقية. أفهم المشكلة كإداري، وأبني حلها بالبيانات والأتمتة والذكاء الاصطناعي.",
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
      label: "المبيعات",
      unit: "ريال سعودي",
      title: "مبيعات حققتها منتجاتي ومشاريعي",
      desc: "عوائد فعلية من منتجات رقمية ومتاجر بنيتها وطورتها لعملائي.",
    },
    {
      value: 600,
      label: "العملاء",
      unit: "عميل سعيد",
      title: "عملاء استفادوا من حلولي",
      desc: "أكثر من ٦٠٠ عميل: مطاعم ومتاجر وأفراد، كل واحد منهم مشكلة تحولت لحل.",
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
        "إدارة رحلة المستفيد من حجز الموعد إلى إغلاق الطلب",
        "تشغيل سلسلة التأمين والموافقات والإحالات ومتابعتها",
        "التعامل مع الشكاوى وتحويلها لتحسينات في الإجراءات",
        "تسويات ومتابعة تشغيلية بالبيانات عبر Excel",
        "تحليل المشكلات التشغيلية وتحسين الإجراءات",
        "موظف الشهر مرتين متتاليتين",
      ],
    },
  ],

  education: [
    { title: "بكالوريوس إدارة الأعمال", place: "تخصص الإدارة العامة" },
  ],

  skills: [
    { group: "تحليل العمليات", items: ["تحسين الإجراءات", "BPMN", "تحليل المتطلبات"] },
    { group: "البيانات", items: ["Excel", "Power BI", "SQL"] },
    { group: "إدارة المشاريع", items: ["التخطيط والمتابعة", "إطلاق المنتجات"] },
    { group: "الذكاء الاصطناعي والأتمتة", items: ["أدوات AI", "أتمتة سير العمل"] },
    { group: "بناء المنتجات", items: ["UI / UX", "Next.js", "Supabase"] },
  ],
  languages: [
    { name: "العربية", level: "اللغة الأم" },
    { name: "الإنجليزية", level: "في بيئة العمل" },
  ],
  interests: ["التحول الرقمي", "الأتمتة", "الذكاء الاصطناعي", "SaaS", "تحويل المشكلات اليومية إلى منتجات"],

  contact: {
    email: "hi@ahmedalharbi.com",
    links: [
      { label: "X", url: "https://x.com/ahmedsupsa" },
      { label: "TikTok", url: "https://www.tiktok.com/@ahmedsupsa" },
      { label: "GitHub", url: "https://github.com/ahmedsupsa" },
    ],
  },
};
