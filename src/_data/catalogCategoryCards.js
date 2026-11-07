/* 07.11 (Никита: «клиенту понравилось, делаем как основной»).
 * Данные основного вида раздела «Продукция» — карточки категорий.
 * Вырос из тестовой ветки /products2/ (25.10); тестовая ветка убрана.
 *
 * Два уровня + страницы брендов, как были:
 *   1) /products/              — карточки категорий (вместо прежних
 *                                раскрывающихся строк; старая версия
 *                                сохранена — см. src/test-only/);
 *   2) /products/<категория>/  — карточки брендов категории;
 *   →  /products/<бренд>/      — страница бренда, адрес прежний (решение
 *                                Никиты 07.11: одна страница на бренд, без
 *                                дублей и без поломки ссылок/Google).
 *                                «← <категория>» над заголовком подставляет
 *                                catalog-return.2.js, если пришли из
 *                                категории.
 *
 * Всё строится из тех же catalogCategories.js / brands.js / galleries.js —
 * сами данные не дублируются. Здесь только:
 *   - slug — английский адрес категории (/products/steam-boilers/);
 *   - cover — какой бренд даёт обложку карточки: фото его галереи
 *     («Галерея» на странице бренда), по умолчанию первое. По умолчанию —
 *     первый бренд категории; где фото совпало бы с соседней категорией,
 *     взят следующий бренд, подходящий по смыслу (решение 25.10):
 *       Водогрейные     — LaggarTT  (Hermes уже у «Паровых»);
 *       Конденсационные — Geffen    (Elco — у «Горелок», там это горелка);
 *       Водонагреватели — HuchEnTEC (бойлер; Absolute Tank — у баков).
 *   - photo — другой номер фото галереи; coverFile — своё фото обложки
 *     (лежит в images/catalog-covers/). */
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
  /* 07.11 (Никита): у Ньютерма на фото 1 (и 2, 4) их водяной знак —
     взято фото 3, система обратного осмоса, без знака. Было: фото 1. */
  "vodopodgotovka": { slug: "water-treatment", cover: "nyuterm", photo: 3 },
  "vodonagrevateli": { slug: "water-heaters", cover: "huchentec" },
  /* 07.11 (Никита): своя обложка — красные мембранные баки, по
     образцу рендера Boiler: на сером фоне карточек (#f3f4f6), по
     центру, ~72% кадра 384:300. Файл — images/catalog-covers/.
     Было: первое фото галереи Absolute Tank. */
  "rasshiritelnye-baki": {
    slug: "expansion-tanks",
    cover: "absolute-tank",
    coverFile: { dir: "catalog-covers", name: "expansion-tanks", widths: [640, 1280] },
  },
};

const brandBySlug = Object.fromEntries(brands.map((b) => [b.slug, b]));

const cats = categories.map((cat) => {
  const m = MAP[cat.slug];
  if (!m) throw new Error("catalogCategoryCards: нет английского адреса для категории " + cat.slug);
  const coverSlug = m.cover || (cat.brands[0] && cat.brands[0].slug);
  const g = galleries["brand-" + coverSlug];
  if (!g) throw new Error("catalogCategoryCards: нет галереи для обложки " + coverSlug);
  /* 07.11: либо своё фото (coverFile), либо фото из галереи бренда. */
  const own = m.coverFile;
  const widths = own ? own.widths : (g.widths || [400, 700, 1000]);
  return {
    slug: m.slug,
    sourceSlug: cat.slug,
    name: cat.name,
    note: cat.note,
    cover: {
      dir: own ? own.dir : g.dir,
      /* Начало имени файла: "<name>" для своего фото или "photo-N"
         для галереи; дальше -<ширина>.jpg/.webp. */
      prefix: own ? own.name : "photo-" + (m.photo || 1),
      widths,
      maxW: widths[widths.length - 1],
      alt: cat.name,
    },
    brands: (cat.brands || []).map((b) => {
      if (!brandBySlug[b.slug]) throw new Error("catalogCategoryCards: нет страницы бренда " + b.slug);
      return Object.assign({}, b);
    }),
  };
});

module.exports = { categories: cats };
