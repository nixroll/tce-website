/* 28.09. Вид "Бренды" на /catalog/brands/ — все бренды со всех категорий
 * (catalogCategories.js), каждый ОДИН раз, по алфавиту (сначала латиница,
 * потом кириллица). Отдельного макета нет — по словам пользователя.
 *
 * Список не ведётся руками: добавили бренд в категорию — он появился и
 * здесь, убрали из всех категорий — пропал.
 *
 * Для каждого бренда:
 *   name, logo — из первой категории, где он встречается (порядок
 *                категорий как на странице);
 *   tags       — короткие названия всех его категорий (поле tag у
 *                категории) в порядке страницы, через " / "; если их
 *                больше двух — первые два и "+N", как в карточках Figma
 *                ("Паровые / Водогрейные / +2");
 *   hasPage    — есть ли своя страница /catalog/<slug>/ (как в категориях). */
const categories = require("./catalogCategories.js");

const bySlug = new Map();
for (const cat of categories) {
  for (const b of cat.brands || []) {
    if (!bySlug.has(b.slug)) {
      bySlug.set(b.slug, { slug: b.slug, name: b.name, logo: b.logo, hasPage: b.hasPage, cats: [] });
    }
    const entry = bySlug.get(b.slug);
    if (!entry.cats.includes(cat.tag)) entry.cats.push(cat.tag);
  }
}

const isCyrillic = (s) => /^[Ѐ-ӿ]/.test(s);
const collator = new Intl.Collator("ru", { sensitivity: "base" });

module.exports = [...bySlug.values()]
  .sort((a, b) => isCyrillic(a.name) - isCyrillic(b.name) || collator.compare(a.name, b.name))
  .map(({ cats, ...b }) => ({
    ...b,
    tags: cats.length > 2 ? `${cats.slice(0, 2).join(" / ")} / +${cats.length - 2}` : cats.join(" / "),
  }));
