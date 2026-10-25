/* 25.10 (Никита, правка клиента). Данные тестовой ветки раздела
 * «Продукция» — /products2/ (только на тестовом сайте GitHub Pages,
 * на боевом хостинге этих страниц нет: см. eleventy.config.js).
 *
 * Три уровня вместо двух:
 *   1) /products2/                       — карточки категорий (вместо
 *                                          раскрывающихся строк);
 *   2) /products2/<категория>/           — карточки брендов категории;
 *   3) /products2/<категория>/<бренд>/   — страница бренда (копия
 *                                          /products/<бренд>/ с кнопкой
 *                                          «← <категория>»).
 *
 * Всё строится из тех же catalogCategories.js / brands.js / galleries.js,
 * что и текущий раздел /products/ — сами данные не дублируются и не
 * меняются. Здесь только:
 *   - slug — английский адрес категории (как в примере Никиты:
 *     /products2/steam-boilers/);
 *   - cover — какой бренд даёт обложку карточки категории: первое фото
 *     его галереи («Галерея» на странице бренда). По умолчанию — первый
 *     бренд категории; где у первых брендов фото совпало бы с соседней
 *     категорией, взят следующий бренд, подходящий по смыслу (решение
 *     Никиты 25.10: «без повторов, по смыслу»):
 *       Водогрейные     — LaggarTT  (Hermes уже у «Паровых»);
 *       Конденсационные — Geffen    (Elco — у «Горелок», там это горелка);
 *       Водонагреватели — HuchEnTEC (бойлер; Absolute Tank — у баков). */
const categories = require("./catalogCategories.js");
const brands = require("./brands.js");
const galleries = require("./galleries.js");

const MAP = {
  "parovye-kotly": { slug: "steam-boilers", cover: "hermes" },
  "parogeneratory": { slug: "steam-generators", cover: "alba" },
  "vodogreynye-kotly": { slug: "hot-water-boilers", cover: "laggartt" },
  "kondensatsionnye-kotly": { slug: "condensing-boilers", cover: "geffen" },
  "gorelki": { slug: "burners", cover: "elco" },
  "deaeratory": { slug: "deaerators", cover: "boiler" },
  "nasosy": { slug: "pumps", cover: "grandfar" },
  "vodopodgotovka": { slug: "water-treatment", cover: "nyuterm" },
  "vodonagrevateli": { slug: "water-heaters", cover: "huchentec" },
  "rasshiritelnye-baki": { slug: "expansion-tanks", cover: "absolute-tank" },
};

const brandBySlug = Object.fromEntries(brands.map((b) => [b.slug, b]));

const cats = categories.map((cat) => {
  const m = MAP[cat.slug];
  if (!m) throw new Error("products2: нет английского адреса для категории " + cat.slug);
  const coverSlug = m.cover || (cat.brands[0] && cat.brands[0].slug);
  const g = galleries["brand-" + coverSlug];
  if (!g) throw new Error("products2: нет галереи для обложки " + coverSlug);
  const widths = g.widths || [400, 700, 1000];
  return {
    slug: m.slug,
    sourceSlug: cat.slug,
    name: cat.name,
    note: cat.note,
    cover: {
      dir: g.dir,
      widths,
      maxW: widths[widths.length - 1],
      alt: cat.name,
    },
    brands: (cat.brands || []).map((b) => {
      if (!brandBySlug[b.slug]) throw new Error("products2: нет страницы бренда " + b.slug);
      return Object.assign({}, b);
    }),
  };
});

/* Пары «категория + бренд» для третьего уровня. Бренд из нескольких
   категорий получает свою страницу в каждой (Hermes — и в паровых, и в
   водогрейных), чтобы кнопка «назад» вела в ту категорию, откуда пришли. */
const pages = [];
for (const cat of cats) {
  for (const b of cat.brands) {
    pages.push({ cat, brand: brandBySlug[b.slug] });
  }
}

module.exports = { categories: cats, pages };
