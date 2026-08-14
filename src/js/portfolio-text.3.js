/* 13.08. Синхронизирует текст слева (название объекта + описание) в
 * Portfolio - D (/services/) со слайдом картинки справа — картинка
 * листается через gallery.js (тот же механизм, что у Gallery - L/
 * Projects - L), а текст физически лежит СНАРУЖИ трека (отдельная
 * панель, не ещё один слайд в общем ряду), поэтому сам gallery.js про
 * него ничего не знает — вместо этого он кидает кастомное событие
 * 'gallery:change' на root ([data-gallery]) при каждой РЕАЛЬНОЙ смене
 * слайда (см. подробный комментарий в самом gallery.js), а этот
 * скрипт слушает событие и подменяет текст.
 *
 * Анимация — по просьбе пользователя "слегка растворяется по
 * вертикали", как секция Signals на attio.com: класс is-swapping
 * переводит блок в opacity:0 + сдвиг по Y (CSS transition, см.
 * .portfolio-d__text-wrap в style.8.css), через SWAP_DELAY_MS (должно
 * совпадать с длительностью CSS-transition) подменяем textContent и
 * снимаем класс — блок тем же transition возвращается в opacity:1 и
 * исходное положение. Один и тот же элемент используется для fade-out
 * И fade-in (не 4 разных блока друг под другом) — так высота
 * контейнера всегда равна высоте ТЕКУЩЕГО текста, лишний "прыжок"
 * layout при переключении не нужен гасить отдельно.
 *
 * Тексты всех слайдов лежат в разметке всегда (.portfolio-d__text-data,
 * display:none через [hidden]) — не JSON в data-атрибуте, чтобы не
 * возиться с экранированием кавычек/амперсандов (там &nbsp;) в HTML-
 * атрибуте, см. подробности в portfolio-d.njk.
 *
 * 13.08, багфикс (пользователь: "тексты не перещелкиваются", на всех
 * брейкпоинтах) — scope брался как root.parentElement
 * (.portfolio-d__container), а .portfolio-d__text-data в разметке лежит
 * ВНЕ контейнера (сосед .portfolio-d__container внутри <section
 * class="portfolio-d">, см. portfolio-d.njk) — dataRoot всегда был
 * null, скрипт тихо делал return ДО addEventListener, слушатель вообще
 * не вешался. root.closest('.portfolio-d') поднимается до самой секции
 * целиком — гарантированно накрывает и text-wrap (внутри контейнера),
 * и text-data (вне его), независимо от точной вложенности разметки.
 *
 * 14.08, ТЗ дизайнера: max-width у .portfolio-d__text-wrap теперь
 * СВОЙ на каждый слайд и каждый брейкпоинт (см. таблицу в
 * portfolio-d.njk/style.8.css) — реализовано модификатором
 * is-slide-0..3 на том же wrap, что и текст. Переключаем его ЗДЕСЬ ЖЕ,
 * в момент подмены textContent (когда блок уже невидим, opacity:0
 * посередине fade) — если поменять класс раньше (одновременно с
 * is-swapping), старый текст на миг переносился бы под новую ширину
 * ДО того, как сам fade скроет несоответствие. */
(function () {
  var SWAP_DELAY_MS = 260; /* должно совпадать с transition-duration в CSS */
  var SLIDE_CLASS_RE = /\bis-slide-\d+\b/g;

  function setSlideClass(el, index) {
    el.className = el.className.replace(SLIDE_CLASS_RE, '').trim();
    el.classList.add('is-slide-' + index);
  }

  var roots = document.querySelectorAll('[data-gallery]');
  Array.prototype.forEach.call(roots, function (root) {
    var scope = root.closest('.portfolio-d') || root.parentElement || document;
    var wrap = scope.querySelector('[data-portfolio-text]');
    if (!wrap) return;

    var titleEl = wrap.querySelector('[data-portfolio-title]');
    var descEl = wrap.querySelector('[data-portfolio-desc]');
    var dataRoot = scope.querySelector('.portfolio-d__text-data');
    if (!titleEl || !descEl || !dataRoot) return;

    var slides = Array.prototype.map.call(
      dataRoot.querySelectorAll('[data-slide-text]'),
      function (el) {
        return {
          title: el.querySelector('[data-title]').textContent,
          desc: el.querySelector('[data-desc]').textContent
        };
      }
    );
    if (!slides.length) return;

    var reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pending = null;

    root.addEventListener('gallery:change', function (e) {
      var data = slides[e.detail.index];
      if (!data) return;

      if (reduceMotion) {
        titleEl.textContent = data.title;
        descEl.textContent = data.desc;
        setSlideClass(wrap, e.detail.index);
        return;
      }

      if (pending) clearTimeout(pending);
      wrap.classList.add('is-swapping');
      pending = setTimeout(function () {
        titleEl.textContent = data.title;
        descEl.textContent = data.desc;
        setSlideClass(wrap, e.detail.index);
        wrap.classList.remove('is-swapping');
        pending = null;
      }, SWAP_DELAY_MS);
    });
  });
})();
