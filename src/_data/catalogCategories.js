/* 23.09. Категории каталога для вида "Категории" на /catalog/ (см.
 * _includes/catalog-l.njk, Figma "Catalog / Categories", node 1846:4232).
 *
 * Названия и подписи (note) — 1:1 из Figma, в том же порядке, что строки
 * Category Row в макете (сверено по всем 5 брейкпоинтам — порядок и
 * текст везде одинаковые).
 *
 * slug — id строки на странице: по нему работает прямая ссылка на
 * раскрытую категорию (/catalog/#gorelki откроет "Горелки", см.
 * js/catalog-categories.js).
 *
 * brands — карточки внутри категории, по одной на бренд:
 *   slug — имя файла логотипа (src/images/catalog-l/<slug>.svg) и,
 *          если у бренда есть своя страница (он есть в brands.js),
 *          адрес /catalog/<slug>/ для кнопки "Смотреть";
 *   name — название под обложкой;
 *   tags — строка под названием. Своя для категории, НЕ из brands.js:
 *          в макете у одного и того же бренда в разных категориях
 *          разные теги (у Viessmann в "Паровых котлах" —
 *          "Паровые / Водогрейные / +2").
 * Пока у категории нет brands, при раскрытии показываются 5
 * карточек-заглушек ("Название"/"Описание", без логотипа) — так было
 * решено на старте, категории заполняются по одной.
 *
 * note (подпись "5 брендов" в строке категории) у заполненных категорий
 * считается от длины brands автоматически (см. низ файла), у
 * незаполненных пока стоит текст из Figma. */
const categories = [
  {
    slug: "parovye-kotly",
    name: "Паровые котлы",
    note: "5 брендов",
    /* 24.09: заполнено по Figma (node 1859:14576), порядок как в
       макете. Своя страница из этих пяти пока есть только у Viessmann. */
    brands: [
      { slug: "hermes", name: "Hermes", tags: "Паровые / Водогрейные" },
      { slug: "laggartt", name: "LaggarTT", tags: "Паровые / Водогрейные" },
      { slug: "teplofor", name: "Teplofor", tags: "Паровые / Водогрейные" },
      { slug: "viessmann", name: "Viessmann", tags: "Паровые / Водогрейные / +2" },
      { slug: "kzkeo", name: "КЗКЭО", tags: "Паровые" },
    ],
  },
  { slug: "parogeneratory", name: "Парогенераторы промышленные", note: "1 бренд" },
  { slug: "vodogreynye-kotly", name: "Водогрейные котлы", note: "5 брендов" },
  { slug: "kondensatsionnye-kotly", name: "Конденсационные котлы", note: "4 бренда" },
  { slug: "gorelki", name: "Горелки", note: "3 бренда" },
  { slug: "deaeratory", name: "Деаэраторы и паровое оборудование", note: "2 бренда" },
  { slug: "nasosy", name: "Насосы для котельных", note: "3 бренда" },
  { slug: "vodopodgotovka", name: "Водоподготовка", note: "1 бренд" },
  { slug: "vodonagrevateli", name: "Водонагреватели", note: "5 брендов" },
  { slug: "rasshiritelnye-baki", name: "Расширительные баки", note: "3 бренда" },
];

/* "1 бренд / 3 бренда / 5 брендов" — обычное русское склонение по числу. */
function brandsLabel(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} бренд`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} бренда`;
  return `${n} брендов`;
}

/* Ссылка "Смотреть" — только у тех, у кого есть страница /catalog/<slug>/
   (страницы генерируются по brands.js, см. catalog-brand.njk). */
const brandPages = new Set(require("./brands.js").map((b) => b.slug));

module.exports = categories.map((cat) =>
  cat.brands
    ? {
        ...cat,
        note: brandsLabel(cat.brands.length),
        brands: cat.brands.map((b) => ({ ...b, hasPage: brandPages.has(b.slug) })),
      }
    : cat
);
