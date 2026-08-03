/* Карусель галереи секции Projects - L (projects.njk).
 *
 * Требования (по макету и ТЗ):
 * - 9 реальных слайдов; видно 1 (320/390), 2 (768/1000) или 3 (1440) —
 *   задаётся CSS через flex-basis, JS ширину слайда только измеряет;
 * - клик по стрелке сдвигает ровно на ОДИН слайд с плавной анимацией
 *   (transition на .projects__track в CSS);
 * - галерея зациклена в обе стороны: по краям добавлены клоны (по 3 —
 *   максимум видимых), после завершения анимации на клонах индекс
 *   мгновенно и незаметно «перескакивает» на реальный слайд;
 * - при быстрых кликах текущая анимация мгновенно доводится до конца
 *   и сразу начинается следующая (клики не игнорируются);
 * - на resize позиция пересчитывается без анимации;
 * - при prefers-reduced-motion CSS отключает transition — перелистывание
 *   становится мгновенным, логика та же.
 *
 * Кнопки продублированы в разметке (intro с 768px, bottom до 768px),
 * поэтому обработчики вешаются на все [data-gallery-prev/next]. */
(function () {
  var root = document.querySelector('[data-gallery]');
  if (!root) return;

  var track = root.querySelector('[data-gallery-track]');
  if (!track) return;

  var realSlides = Array.prototype.slice.call(track.children);
  var realCount = realSlides.length;
  if (realCount < 2) return;

  var CLONES = 3; /* максимум одновременно видимых слайдов */

  for (var i = 0; i < CLONES; i++) {
    var tail = realSlides[i].cloneNode(true);
    var head = realSlides[realCount - 1 - i].cloneNode(true);
    tail.setAttribute('aria-hidden', 'true');
    head.setAttribute('aria-hidden', 'true');
    track.appendChild(tail);
    track.insertBefore(head, track.firstChild);
  }

  var index = CLONES; /* первый реальный слайд */
  var animating = false;

  function step() {
    var first = track.children[0];
    if (!first) return 0;
    var styles = window.getComputedStyle(track);
    var gap = parseFloat(styles.columnGap || styles.gap) || 0;
    return first.getBoundingClientRect().width + gap;
  }

  function apply(instant) {
    if (instant) track.style.transition = 'none';
    track.style.transform = 'translate3d(' + -index * step() + 'px, 0, 0)';
    if (instant) {
      void track.getBoundingClientRect(); /* форсируем reflow */
      track.style.transition = '';
    }
  }

  /* Если ушли в зону клонов — незаметно возвращаемся на реальные слайды. */
  function normalize() {
    if (index >= CLONES + realCount) {
      index -= realCount;
      apply(true);
    } else if (index < CLONES) {
      index += realCount;
      apply(true);
    }
  }

  function move(dir) {
    if (animating) {
      /* мгновенно доводим предыдущий сдвиг до конца */
      animating = false;
      apply(true);
      normalize();
    }
    index += dir;
    animating = true;
    apply(false);
  }

  track.addEventListener('transitionend', function (e) {
    if (e.target !== track || e.propertyName !== 'transform') return;
    animating = false;
    normalize();
  });

  var prevButtons = document.querySelectorAll('[data-gallery-prev]');
  var nextButtons = document.querySelectorAll('[data-gallery-next]');
  Array.prototype.forEach.call(prevButtons, function (btn) {
    btn.addEventListener('click', function () { move(-1); });
  });
  Array.prototype.forEach.call(nextButtons, function (btn) {
    btn.addEventListener('click', function () { move(1); });
  });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      animating = false;
      apply(true);
      normalize();
    }, 100);
  });

  apply(true);
})();
