/* Лёгкий параллакс для фото — предложение пользователя, в Figma не
 * реализуемо и не отражено, чистое JS-улучшение поверх готовой вёрстки.
 *
 * 18.08: файл назывался areas-parallax.js и работал только с секцией
 * Areas на Home. Пользователь попросил тот же эффект для обложки в
 * Brand Hero - L на страницах брендов, поэтому скрипт обобщён, а имя
 * перестало врать про область применения. Список "рамок" — в FRAMES
 * ниже; чтобы подключить эффект к новой секции, достаточно дописать
 * туда селектор её контейнера, при условии что вёрстка устроена так же
 * (см. следующий абзац).
 *
 * Как работает: контейнер уже клипует содержимое (overflow: hidden), а
 * img внутри абсолютно спозиционирован и растянут object-fit: cover —
 * то есть это готовая "рамка" для параллакса, ничего в разметке и CSS
 * менять не нужно. Так устроены и .areas__image (фиксированный
 * aspect-ratio 615/460), и .brand-hero__cover (высота от flex-роста).
 * Картинку слегка увеличиваем (scale) JS-ом, чтобы у неё появился запас
 * на сдвиг без оголения краёв контейнера, и на скролле плавно двигаем
 * по вертикали (translateY) в зависимости от того, насколько центр
 * контейнера сместился от центра вьюпорта — чем дальше от центра
 * экрана, тем сильнее сдвиг.
 *
 * Без JS или при prefers-reduced-motion картинка остаётся как есть,
 * без scale и без сдвига — 1:1 как в Figma, ничего не задваивается.
 *
 * Максимальный сдвиг — НЕ фиксированный px, а доля от реальной высоты
 * картинки (SHIFT_RATIO). Так и было изначально (фикс. 12px), но
 * пользователь заметил: на мобилке/планшете эффект отличный, а на
 * десктопе почти не виден — не баг, а следствие вёрстки: карточка
 * .areas__image на десктопе (768px+, особенно 1000px+ с flex-row и
 * увеличенным паддингом) рендерится в разы выше (реально проверено:
 * ~529px на 1440px-вьюпорте против ~200px на мобилке), а сдвиг был
 * одинаковым в px на любом брейкпоинте — те же 12px на 529px картинке
 * визуально почти незаметны, хотя на 200px картинке смотрелись
 * заметно. Проценты от высоты решают это: эффект одинаково "лёгкий"
 * относительно размера фото на любом брейкпоинте.
 *
 * SCALE даёт запас по краю без оголения контейнера: (SCALE-1)/2 от
 * высоты на каждую сторону (при 1.15 — 7.5% высоты). SHIFT_RATIO
 * держится заметно ниже этого запаса (с margin на случай неточностей
 * раскладки), MAX_SHIFT_CAP — страховка сверху для нетипично высоких
 * картинок. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* Контейнеры-"рамки". Берём именно их, а не сразу img: рамка задаёт
     обрезку и реальные размеры, по которым считается сдвиг. Раньше для
     этого использовался img.parentElement, но у Brand Hero между
     картинкой и рамкой стоит ещё <picture> — так что опираться на
     прямого родителя больше нельзя. */
  var FRAMES = '.areas__image, .brand-hero__cover';

  var items = [];
  Array.prototype.forEach.call(
    document.querySelectorAll(FRAMES),
    function (frame) {
      var img = frame.querySelector('img');
      if (img) items.push({ frame: frame, img: img });
    }
  );
  if (!items.length) return;

  var SCALE = 1.15;
  var SHIFT_RATIO = 0.055; /* доля от высоты картинки, в каждую сторону */
  var MAX_SHIFT_CAP = 32; /* px — страховочный потолок */

  items.forEach(function (item) {
    item.img.style.transform = 'scale(' + SCALE + ') translateY(0px)';
    item.img.style.willChange = 'transform';
  });

  var ticking = false;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function update() {
    ticking = false;
    var viewportH = window.innerHeight;

    items.forEach(function (item) {
      var img = item.img;
      var rect = item.frame.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > viewportH) return; /* вне экрана */

      var maxShift = Math.min(rect.height * SHIFT_RATIO, MAX_SHIFT_CAP);
      var elCenter = rect.top + rect.height / 2;
      var viewportCenter = viewportH / 2;
      var range = viewportCenter + rect.height / 2;
      var progress = clamp((elCenter - viewportCenter) / range, -1, 1);
      var shift = progress * maxShift;

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
