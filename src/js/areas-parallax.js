/* Лёгкий параллакс для фото в секции Areas (.areas__image img) —
 * предложение пользователя, в Figma не реализуемо и не отражено,
 * чистое JS-улучшение поверх уже готовой вёрстки.
 *
 * Как работает: .areas__image уже клипует контент (overflow: hidden,
 * фиксированный aspect-ratio 615/460), а img внутри абсолютно
 * спозиционирован и растянут object-fit: cover — то есть контейнер
 * уже готовая "рамка" для параллакса, ничего в разметке/CSS менять
 * не нужно. Картинку слегка увеличиваем (scale) JS-ом, чтобы у неё
 * появился запас на сдвиг без оголения краёв контейнера, и на скролле
 * плавно двигаем по вертикали (translateY) в зависимости от того,
 * насколько центр контейнера сместился от центра вьюпорта — чем
 * дальше от центра экрана, тем сильнее сдвиг (в пределах MAX_SHIFT).
 *
 * Без JS или при prefers-reduced-motion картинка остаётся как есть,
 * без scale и без сдвига — 1:1 как в Figma, ничего не задваивается.
 *
 * SCALE подобран с запасом под MAX_SHIFT: на самом маленьком реальном
 * рендере карточки (мобилка, ~200px высоты) запас по краю от scale
 * 1.15 — 15px на сторону, чем хватает с небольшим запасом на
 * MAX_SHIFT = 12px. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var images = Array.prototype.slice.call(
    document.querySelectorAll('.areas__image img')
  );
  if (!images.length) return;

  var SCALE = 1.15;
  var MAX_SHIFT = 12; /* px, в каждую сторону — «совсем лёгкий» эффект */

  images.forEach(function (img) {
    img.style.transform = 'scale(' + SCALE + ') translateY(0px)';
    img.style.willChange = 'transform';
  });

  var ticking = false;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function update() {
    ticking = false;
    var viewportH = window.innerHeight;

    images.forEach(function (img) {
      var rect = img.parentElement.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > viewportH) return; /* вне экрана */

      var elCenter = rect.top + rect.height / 2;
      var viewportCenter = viewportH / 2;
      var range = viewportCenter + rect.height / 2;
      var progress = clamp((elCenter - viewportCenter) / range, -1, 1);
      var shift = progress * MAX_SHIFT;

      img.style.transform =
        'scale(' + SCALE + ') translateY(' + shift.toFixed(2) + 'px)';
    });
  }

  function onScrollOrResize() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize);
  update();
})();
