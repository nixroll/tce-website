/* 14.08. Единый список брендов каталога — источник правды сразу для
 * двух мест:
 *   1) карточки секции Catalog - L (см. _includes/catalog-l.njk);
 *   2) страницы бренда /catalog/<slug>/ (см. catalog-brand.njk,
 *      генерируются пагинацией по этому же массиву).
 * Так название/теги/адрес не разъезжаются между сеткой и страницей
 * бренда, а добавление десятого бренда сводится к одной записи здесь.
 *
 * slug — одновременно имя файла логотипа
 * (src/images/catalog-l/<slug>.svg) и сегмент URL.
 *
 * Размеры логотипов ЗДЕСЬ НЕ ХРАНЯТСЯ намеренно: они заданы в CSS
 * (.catalog-l__logo--<slug> в style.css), потому что это чисто
 * презентационная величина из Figma и дублировать её во втором месте
 * означало бы завести второй источник правды. В Brand Hero логотип
 * вообще нормализуется по высоте (30px, ширина auto — см. ТЗ и
 * .brand-hero__logo), поэтому там размеры per-brand не нужны.
 *
 * tags (Supporting text в макете Catalog - L) — сверены с Figma по
 * ВСЕМ 5 брейкпоинтам (у каждого свой набор текстовых нод, поэтому
 * дизайнер теоретически мог заполнить не везде): 320/390/768/1000/1440
 * дают одинаковый текст у всех девяти брендов, плейсхолдеров
 * "Тег / Тег / Тег" не осталось ни на одном. В самой вёрстке текст в
 * любом случае один на все брейкпоинты — он берётся отсюда.
 *
 * 17.08, добавлены поля под страницу бренда (секция Brand Hero - L,
 * node 1515:24095):
 *
 * category — вторая (серая) строка заголовка Brand Hero, напр.
 *   "Радиаторы и конвекторы." — это НЕ то же самое, что tags: tags —
 *   короткие категории через слэш для карточки каталога, category —
 *   человекочитаемая фраза с точкой на конце для заголовка страницы.
 *   Оба поля per-brand и заполняются отдельно.
 *
 * cover — базовое имя файла обложки в src/images/brand-hero/ (без
 *   суффикса ширины и расширения; варианты 800/1300/2000/2560 в
 *   jpg+webp генерируются заранее). Фото пока прислано только для
 *   Arbonia — у остальных брендов поля нет, и секция в этом случае
 *   рендерит обложку Arbonia как временную заглушку (см.
 *   brand-hero.njk). Как только придут свои фото — добавить
 *   cover: "<slug>" в нужную строку, разметку править не придётся. */
module.exports = [
  {
    slug: "arbonia",
    name: "Arbonia",
    tags: "Радиаторы / Конвекторы",
    category: "Радиаторы и&nbsp;конвекторы.",
    cover: "arbonia",
  },
  {
    slug: "elco",
    name: "Elco",
    tags: "Горелки / Отопление",
    category: "Горелки и&nbsp;отопление.",
    cover: "elco",
    /* Исходник обложки 1920x1200, а не 2560 как у Arbonia — поэтому свой
       набор ширин. Объявлять несуществующие 2000w/2560w нельзя: браузер
       выбрал бы их на retina-десктопе и растянул бы картинку. */
    coverWidths: [800, 1300, 1920],
  },
  {
    slug: "flamco",
    name: "Flamco",
    tags: "Баки / Сепараторы",
    category: "Баки и&nbsp;сепараторы.",
    cover: "flamco",
    /* Исходник 2362x1575 — свой набор ширин, как и у Elco. */
    coverWidths: [800, 1300, 2362],
  },
  {
    slug: "geberit",
    name: "Geberit",
    tags: "Инсталляции / Трубы / Сантехника",
    category: "Инсталляции, трубы и&nbsp;сантехника.",
    cover: "geberit",
    /* Исходник 1600x900 — дальше апскейл, поэтому свой набор. */
    coverWidths: [800, 1300, 1600],
  },
  {
    slug: "kermi",
    name: "Kermi",
    tags: "Радиаторы / Душевые / Вентиляция",
    category: "Радиаторы, душевые и&nbsp;вентиляция.",
    cover: "kermi",
    /* Обложка заменена на вариант из папки «Каталог Фото»
       (1998x1000). Прежняя была присланным скриншотом 3376px. */
    coverWidths: [800, 1300, 1998],
  },
  {
    /* 20.08. Meibes убран из каталога по правке в Figma (node
       1487:17117) — на его место, шестой карточкой во втором ряду,
       встал Tece. Позиция та же, поэтому порядок остальных брендов и
       раскладка сетки не меняются.
       Название пишется "Tece", а не "TECE" — так в макете.
       Своих обложки, галереи и категорий у бренда пока нет, страница
       /catalog/tece/ подставит набор Arbonia как временную заглушку. */
    slug: "tece",
    name: "Tece",
    tags: "Инсталляции / Трапы / Трубы",
    category: "Инсталляции, трапы и&nbsp;трубы.",
    cover: "tece",
  },
  {
    slug: "oventrop",
    name: "Oventrop",
    tags: "Клапаны / Термостаты",
    category: "Клапаны и&nbsp;термостаты.",
    cover: "oventrop",
  },
  {
    slug: "viessmann",
    name: "Viessmann",
    tags: "Котлы / Теплонасосы / Отопление",
    category: "Котлы, теплонасосы и&nbsp;отопление.",
    cover: "viessmann",
    /* Исходник 1920x1080. */
    coverWidths: [800, 1300, 1920],
  },
  {
    slug: "wilo",
    name: "Wilo",
    tags: "Насосы / Станции / Автоматика",
    category: "Насосы, станции и&nbsp;автоматика.",
    cover: "wilo",
    /* Исходник 1920x821. */
    coverWidths: [800, 1300, 1920],
  },
  /* 29.09 (вечер): обложки Brand Hero — из папки «Media/Images/Brand
     Covers» (подборка коллеги, источники в sources.md там же). Ширины —
     до исходной ширины кадра, без апскейла; вертикальные кадры Hermes и
     Ньютерм заранее обрезаны по центру до 3:2. */
  /* 29.09. Бренды из каталога категорий (catalogCategories.js) — у
     каждого теперь своя страница /catalog/<slug>/. Фото пока нет: поля
     cover нет, поэтому Brand Hero рисует серый прямоугольник вместо
     обложки, галерея — пустые квадраты (см. brand-hero.njk,
     catalog-brand.njk). category — вторая строка заголовка, собрана из
     линейки бренда (карточки Brand Catalog в Figma). tags здесь не
     нужны: карточки каталога берут теги из catalogCategories.js. */
  { slug: "absolute-tank", name: "Absolute Tank", category: "Бойлеры&nbsp;и&nbsp;расширительные баки.", cover: "absolute-tank" },
  { slug: "alba", name: "Alba", category: "Промышленные парогенераторы.", cover: "alba", coverWidths: [800, 1300, 2000, 2500] },
  { slug: "boiler", name: "Boiler", category: "Деаэраторы для&nbsp;котельных.", cover: "boiler" },
  { slug: "execo", name: "ExEco", category: "Газовые и&nbsp;дизельные горелки.", cover: "execo", coverWidths: [800, 1300, 2000] },
  { slug: "flameair", name: "Flameair", category: "Горелки на&nbsp;газе, дизеле и&nbsp;мазуте.", cover: "flameair", coverWidths: [800, 1300, 2000, 2500] },
  { slug: "geffen", name: "Geffen", category: "Конденсационные котлы.", cover: "geffen" },
  { slug: "grandfar", name: "Grandfar", category: "Насосы и&nbsp;станции давления.", cover: "grandfar", coverWidths: [800, 1300, 2000] },
  { slug: "grundfos", name: "Grundfos", category: "Насосы для&nbsp;отопления и&nbsp;воды.", cover: "grundfos", coverWidths: [800, 1300, 2000, 2480] },
  { slug: "hermes", name: "Hermes", category: "Паровые и&nbsp;водогрейные котлы.", cover: "hermes" },
  { slug: "huchentec", name: "HuchEnTEC", category: "Бойлеры для&nbsp;горячей воды.", cover: "huchentec" },
  { slug: "laggartt", name: "LaggarTT", category: "Промышленные котлы.", cover: "laggartt", coverWidths: [800, 1300, 2000] },
  { slug: "mit", name: "MIT", category: "Бойлеры и&nbsp;баки под&nbsp;давлением.", cover: "mit" },
  { slug: "s-tank", name: "S-Tank", category: "Бойлеры и&nbsp;теплоаккумуляторы.", cover: "s-tank" },
  { slug: "schuster", name: "Schuster", category: "Водогрейные и&nbsp;паровые котлы.", cover: "schuster" },
  { slug: "teplofor", name: "Teplofor", category: "Котлы и&nbsp;парогенераторы.", cover: "teplofor", coverWidths: [800, 1300, 2000, 2500] },
  { slug: "kzkeo", name: "КЗКЭО", category: "Паровые котлы.", cover: "kzkeo" },
  { slug: "nyuterm", name: "Ньютерм", category: "Водоподготовка для&nbsp;котельных.", cover: "nyuterm" },
];
