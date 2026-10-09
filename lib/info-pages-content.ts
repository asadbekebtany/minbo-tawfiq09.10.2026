import type { SiteSettings } from "@/lib/site-settings-constants";

export type InfoBlock = {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
};

export function getAboutContent(s: SiteSettings): InfoBlock[] {
  return [
    {
      heading: `${s.siteName} nima?`,
      paragraphs: [
        `${s.siteName} — O‘zbekistondagi avtomobil ehtiyot qismlari, shinalar, disklar va moylar bo‘yicha online marketplace.`,
        "Biz xaridorlarni ishonchli sotuvchilar bilan bog‘laymiz: qulay qidiruv, shaffof narx va tezkor yetkazib berish.",
      ],
    },
    {
      heading: "Nima uchun biz?",
      bullets: [
        "Keng katalog: shina, disk, moy, filtr, akkumulyator va boshqalar",
        "Do‘kon reytingi va sharhlar orqali ishonch",
        "Buyurtmani profil orqali kuzatish",
        "14 kun ichida qaytarish imkoniyati",
        `Bepul yetkazib berish — ${s.freeDeliveryMin.toLocaleString("uz-UZ")} so‘mdan (Toshkent)`,
      ],
    },
    {
      heading: "Missiyamiz",
      paragraphs: [
        "Har bir avtomobil egasi kerakli ehtiyot qismni tez, xavfsiz va adolatli narxda topsin.",
      ],
    },
  ];
}

export function getContactContent(s: SiteSettings): InfoBlock[] {
  return [
    {
      heading: "Biz bilan bog‘laning",
      paragraphs: [
        "Savol, taklif yoki shikoyat uchun quyidagi kanallar orqali murojaat qiling. Javob odatda 1 ish kuni ichida beriladi.",
      ],
      bullets: [
        `Telefon: ${s.phone}`,
        `Email: ${s.email}`,
        `Telegram: @${s.siteShortName.toLowerCase()}`,
        `Manzil: ${s.address}`,
      ],
    },
    {
      heading: "Ish vaqti",
      bullets: [
        "Dushanba — Shanba: 09:00 — 20:00",
        "Yakshanba: 10:00 — 18:00",
        "Support chat: 24/7 (profil → Support)",
      ],
    },
  ];
}

export function getPrivacyContent(s: SiteSettings): InfoBlock[] {
  return [
    {
      heading: "Qaysi ma’lumotlar yig‘iladi?",
      bullets: [
        "Telefon raqami (OTP orqali kirish)",
        "Ism, yetkazib berish manzili",
        "Buyurtma va to‘lov holati",
        "Qurilma / brauzer haqida texnik ma’lumotlar",
      ],
    },
    {
      heading: "Ma’lumotlar nima uchun ishlatiladi?",
      bullets: [
        "Buyurtmani bajarish va yetkazish",
        "Xavfsizlik va firibgarlikdan himoya",
        "Xizmatni yaxshilash va qo‘llab-quvvatlash",
        "Qonuniy majburiyatlarni bajarish",
      ],
    },
    {
      heading: "Himoya",
      paragraphs: [
        `${s.siteName} foydalanuvchi ma’lumotlarini uchinchi shaxslarga sotmaydi. Ma’lumotlar faqat xizmat ko‘rsatish uchun zarur hollarda (masalan, yetkazib beruvchi) uzatilishi mumkin.`,
        `Savollar uchun: ${s.email}`,
      ],
    },
  ];
}

export function getTermsContent(s: SiteSettings): InfoBlock[] {
  return [
    {
      heading: "Umumiy qoidalar",
      paragraphs: [
        `${s.siteName} platformasidan foydalanish orqali siz ushbu shartlarga rozilik bildirasiz.`,
      ],
      bullets: [
        "Hisob ma’lumotlaringizning to‘g‘riligi uchun o‘zingiz javobgarsiz",
        "Noqonuniy yoki firibgarlik maqsadida foydalanish taqiqlanadi",
        "Narx va mavjudlik real vaqtda o‘zgarishi mumkin",
      ],
    },
    {
      heading: "Buyurtma va to‘lov",
      bullets: [
        "Buyurtma tasdiqlangandan keyin majburiyat yuzaga keladi",
        "To‘lov Payme, Click, karta yoki naqd orqali amalga oshiriladi",
        "Bekor qilish va qaytarish alohida qoidalarga bo‘ysunadi",
      ],
    },
    {
      heading: "Javobgarlik",
      paragraphs: [
        "Marketplace sotuvchilar va xaridorlar o‘rtasida vositachi hisoblanadi. Mahsulot sifatiga oid da’volar avval sotuvchi bilan, so‘ngra support orqali ko‘rib chiqiladi.",
      ],
    },
  ];
}

/** Footer help linklari uchun kengaytirilgan matnlar */
export const HELP_ARTICLES: Record<
  string,
  { title: string; description: string; blocks: InfoBlock[] }
> = {
  "how-to-order": {
    title: "Qanday buyurtma berish",
    description: "Mahsulot tanlashdan buyurtma tasdiqlashgacha bosqichma-bosqich.",
    blocks: [
      {
        heading: "Bosqichlar",
        bullets: [
          "Katalog yoki qidiruv orqali mahsulotni toping",
          "Avtomobil mosligi, narx va sotuvchini tekshiring",
          "«Savatga» tugmasini bosing",
          "Manzil yoki olish punktini tanlang",
          "To‘lov usulini tanlab buyurtmani tasdiqlang",
          "Holatni Profil → Buyurtmalar bo‘limidan kuzating",
        ],
      },
      {
        heading: "Maslahat",
        paragraphs: [
          "Birinchi marta buyurtma berishda telefon raqamingizni OTP orqali tasdiqlang. Keyin savatcha va manzillar saqlanib qoladi.",
        ],
      },
    ],
  },
  delivery: {
    title: "Yetkazib berish",
    description: "Hududlar, muddatlar va bepul yetkazish shartlari.",
    blocks: [
      {
        heading: "Variantlar",
        bullets: [
          "Kuryer orqali uyga yetkazish",
          "Pickup punktidan olib ketish",
          "Aniq muddat checkout vaqtida ko‘rsatiladi",
        ],
      },
      {
        heading: "Narx",
        bullets: [
          "Toshkent: belgilangan summadan bepul yetkazish",
          "Viloyatlar: masofa va og‘irlikka qarab hisoblanadi",
          "Yetkazish narxi savatda oldindan ko‘rinadi",
        ],
      },
    ],
  },
  returns: {
    title: "Qaytarish",
    description: "14 kun ichida qaytarish qoidalari.",
    blocks: [
      {
        heading: "Shartlar",
        bullets: [
          "Mahsulot ishlatilmagan va asl qadoqda bo‘lishi kerak",
          "Komplekt (quti, hujjatlar) to‘liq saqlangan bo‘lsin",
          "Profil → Qaytarishlar orqali ariza yuboring",
          "Sotuvchi tasdiqlagach, omborga qaytarish amalga oshadi",
        ],
      },
      {
        heading: "Pul qaytarish",
        paragraphs: [
          "Tasdiqlangan qaytarishdan so‘ng to‘lov usuliga qarab 3–10 ish kunida qaytariladi.",
        ],
      },
    ],
  },
  payment: {
    title: "To‘lov usullari",
    description: "Xavfsiz va qulay to‘lov variantlari.",
    blocks: [
      {
        heading: "Mavjud usullar",
        bullets: [
          "Payme",
          "Click",
          "Uzcard / Humo bank kartasi",
          "Yetkazib berishda naqd to‘lov",
        ],
      },
      {
        heading: "Xavfsizlik",
        paragraphs: [
          "Karta ma’lumotlari to‘g‘ridan-to‘g‘ri to‘lov tizimlarida qayta ishlanadi. Platforma parol va karta raqamlarini saqlamaydi.",
        ],
      },
    ],
  },
  warranty: {
    title: "Kafolat",
    description: "Original mahsulotlar va ishlab chiqaruvchi kafolati.",
    blocks: [
      {
        heading: "Nimalar kafolatlanadi?",
        bullets: [
          "Ishlab chiqaruvchi belgilagan muddat",
          "Zavod nuqsonlari va ishlamay qolish holatlari",
          "Kafolat muddati mahsulot kartasida ko‘rsatiladi",
        ],
      },
      {
        heading: "Murojaat",
        bullets: [
          "Chek va buyurtma raqamini saqlang",
          "Support yoki sotuvchiga murojaat qiling",
          "Zarur bo‘lsa, mahsulot ekspertizaga yuboriladi",
        ],
      },
    ],
  },
  commission: {
    title: "Komissiya",
    description: "Sotuvchilar uchun marketplace komissiya qoidalari.",
    blocks: [
      {
        heading: "Qanday hisoblanadi?",
        bullets: [
          "Komissiya foizi platforma sozlamalarida belgilanadi",
          "Yetkazilgan buyurtmalar asosida hisoblanadi",
          "Seller panel → Moliya bo‘limida ko‘rinadi",
          "Payout super admin / moliya tomonidan amalga oshiriladi",
        ],
      },
    ],
  },
  "seller-rules": {
    title: "Sotuvchi qoidalari",
    description: "Marketplace sotuvchilari uchun asosiy talablar.",
    blocks: [
      {
        heading: "Majburiyatlar",
        bullets: [
          "Faqat haqiqiy mahsulot va to‘g‘ri tavsif",
          "Narx va ombor qoldig‘ini yangilab boring",
          "Buyurtmani belgilangan muddatda tayyorlang",
          "Xaridor savollari va sharhlariga javob bering",
          "Qaytarish so‘rovlarini o‘z vaqtida ko‘rib chiqing",
        ],
      },
      {
        heading: "Taqiqlanadi",
        bullets: [
          "Soxta sharh yoki reyting",
          "Taqlid / nooriginal mahsulotni original deb sotish",
          "Xaridor bilan platformadan tashqari to‘lovga majburlash",
        ],
      },
    ],
  },
};
