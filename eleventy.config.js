/* 18.08. Сайт живёт по двум адресам, и они требуют РАЗНЫХ путей:
 *   - боевой:  https://thermoconcept.by/        — сайт лежит в корне;
 *   - превью:  https://nixroll.github.io/tce-website/ — в подпапке.
 * Фильтр `url` в шаблонах подставляет pathPrefix во все href/src, поэтому
 * одна и та же сборка не годится для обоих адресов: с префиксом
 * "/tce-website/" на своём домене все CSS/JS/картинки отдали бы 404
 * (браузер пошёл бы за thermoconcept.by/tce-website/css/..., которого там
 * нет), а без префикса — ровно та же беда на GitHub Pages.
 *
 * Поэтому режим выбирается переменной окружения GITHUB_PAGES, которую
 * выставляет только workflow в .github/workflows/deploy.yml. Обычная
 * локальная сборка (`npm run build`) по умолчанию делает БОЕВОЙ вариант
 * под свой домен — именно его мы заливаем на хостинг, так что забыть
 * переключить режим перед выкладкой невозможно.
 * Тот же флаг читает src/_data/site.js — там от него зависит origin в
 * Open Graph и canonical. */
const IS_GITHUB_PAGES = process.env.GITHUB_PAGES === "true";

module.exports = function (eleventyConfig) {
  // Статика копируется как есть в билд
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/fonts");
  eleventyConfig.addPassthroughCopy("src/videos");

  /* Конфиг веб-сервера Apache на хостинге (см. подробные комментарии
     внутри самого файла): редирект www -> без www, сжатие, заголовки
     кеширования. На GitHub Pages не используется — тот отдаёт статику
     своим сервером и .htaccess игнорирует, просто лишний безвредный
     файл в билде. */
  eleventyConfig.addPassthroughCopy({ "src/.htaccess": ".htaccess" });

  /* 21.08. Обработчик формы (Contact - L / Catalog - L → Form - L,
     см. form-l.njk). Обычный .php-файл — не шаблон Eleventy (расширение
     не входит в templateFormats), поэтому сам по себе Eleventy его
     проигнорировал бы; passthrough копирует как есть, без обработки, в
     корень сборки — там его найдёт fetch() из contact-form.js
     ('/contact-send.php') и там же его исполнит Apache на хостинге.
     Пароль от почтового ящика в этом файле НЕ хранится — читается из
     mail-config.php, который живёт только на сервере и никогда не
     попадает ни в git, ни в сборку (см. подробный комментарий в шапке
     contact-send.php и защиту в src/.htaccess). */
  eleventyConfig.addPassthroughCopy({ "src/contact-send.php": "contact-send.php" });

  eleventyConfig.addGlobalData("currentYear", new Date().getFullYear());

  return {
    /* Боевой домен отдаёт сайт с корня, GitHub Pages — из подпапки
       /tce-website/ (project site). См. разбор у IS_GITHUB_PAGES выше. */
    pathPrefix: IS_GITHUB_PAGES ? "/tce-website/" : "/",
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site",
    },
  };
};
