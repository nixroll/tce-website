module.exports = function (eleventyConfig) {
  // Статика копируется как есть в билд
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/images");

  eleventyConfig.addGlobalData("currentYear", new Date().getFullYear());

  return {
    // GitHub Pages отдаёт этот репозиторий как project site:
    // https://nixroll.github.io/tce-website/, а не с корня домена.
    // pathPrefix подставляется фильтром `url` во всех абсолютных путях
    // в шаблонах (href/src). Если позже подключим свой домен — здесь
    // достаточно поменять на "/", в шаблонах ничего трогать не придётся.
    pathPrefix: "/tce-website/",
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site",
    },
  };
};
