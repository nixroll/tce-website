/* Карусель галерей-каруселей на странице: Projects - L (projects.njk,
 * Home) и Docs - L (docs-l.njk, /about/) — оба используют одну и ту же
 * разметку/логику ([data-gallery] > [data-gallery-track] > слайды +
 * [data-gallery-prev/next]), отличаются только количеством слайдов (9
 * у Projects - L, 4 у Docs - L) и видимым числом одновременно (задаёт
 * CSS через flex-basis, JS только измеряет ширину). 11.08: переписано
 * с document.querySelector (брал только ПЕРВУЮ на странице галерею) на
 * querySelectorAll + инициализацию каждой независимо — Home и /about/
 * никогда не показывают обе секции одновременно сейчас, но так код не
 * ломается, если это когда-нибудь изменится. 12.08: index*step() заменён
 * на offsetFor(index) (реальный offsetLeft слайда) в apply()/drag — баг,
 * при котором на некоторых ширинах вьюпорта слева проступал край
 * предыдущего фото (см. комментарий у offsetFor ниже).
 *
 * Требования (по макету и ТЗ) — общие для всех галерей на странице:
 * - N реальных слайдов; видно 1 (320/390), 2 (768/1000) или 3 (1440) —
 *   задаётся CSS через flex-basis, JS ширину слайда только измеряет;
 * - клик по стрелке сдвигает ровно на ОДИН слайд с плавной анимацией
 *   (transition на track в CSS);
 * - галерея зациклена в обе стороны: по краям добавлены клоны (по 3 —
 *   максимум видимых), после завершения анимации на клонах индекс
 *   мгновенно и незаметно «перескакивает» на реальный слайд;
 * - при быстрых кликах текущая анимация мгновенно доводится до конца
 *   и сразу начинается следующая (клики не игнорируются);
 * - drag-перелистывание (Pointer Events — палец на мобилке/планшете,
 *   мышь на десктопе): тянем трек за фото, на отпускании доводим до
 *   ближайшего слайда; лёгкий свайп (>40px) листает на один слайд;
 *   вертикальный скролл страницы не блокируется (touch-action: pan-y);
 * - на resize позиция пересчитывается без анимации;
 * - при prefers-reduced-motion CSS отключает transition — перелистывание
 *   становится мгновенным, логика та же.
 *
 * Кнопки продублированы в разметке (intro с 768px, bottom до 768px) —
 * ВНУТРИ каждой конкретной галереи; обработчики вешаются только на
 * [data-gallery-prev/next], найденные внутри данного root, а не на
 * все такие кнопки на странице (важно, раз галерей может быть больше
 * одной). */
(function () {
  var roots = document.querySelectorAll('[data-gallery]');
  Array.prototype.forEach.call(roots, initGallery);

  function initGallery(root) {
  var track = root.querySelector('[data-gallery-track]');
  if (!track) return;
  var viewport = track.parentElement;

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

  /* 12.08, третий заход: offsetFor(index) убрал накопление ошибки
     (см. комментарий ниже), но остался редкий случай — на 1440px
     (3 слайда в ряд) слева всё равно проступал волосок соседнего
     фото, а на 768/1000 (2 в ряд) на проверенных ширинах — нет.
     Причина: flex-basis у .projects__slide считается через calc() —
     дробное число (напр. при делении на 3 контента 1328px это
     421.333…px на слайд). Пока это ЧАСТЬ ОБЩЕГО ROW (все слайды сразу,
     единый flex-контекст), браузер держит сумму широт точно; но
     .projects__track анимируется на отдельном GPU-слое (will-change:
     transform) и при переводе в композитный слой ЭТА дробная позиция
     слайда снэппится к физическому пикселю уже САМИМ слоем — а не
     тем же способом, каким . projects__gallery (overflow: hidden)
     обрезает в обычной системе координат раскладки. На «круглых»
     ширинах (где деление давало целое число) оба округления случайно
     совпадали, на 1440 — разошлись на доли пикселя (перевод самого
     .projects__gallery на translateZ(0) не помог — округление GPU-слоя
     трека всё равно происходит независимо, до/после клипа). Более
     надёжный фикс — убрать дробность у её ИСТОЧНИКА: жёстко выставляем
     ширину ВСЕХ слайдов (и клонов) через inline flex-basis в целых
     пикселях (замеряем по первому реальному слайду, округляем). Тогда
     "ширина слайда + gap" — всегда целое число, снэппинг GPU-слоя и
     обрезка .projects__gallery видят одну и ту же величину, расхождению
     просто неоткуда взяться. Вызывается при инициализации и на resize
     (до пересчёта позиции), чтобы подстроиться под текущий брейкпоинт. */
  function sizeSlides() {
    var probe = track.children[CLONES];
    if (!probe) return;
    probe.style.flex = ''; /* сброс инлайна — измеряем «свежую» ширину из CSS calc() под текущий брейкпоинт */
    var w = Math.round(probe.getBoundingClientRect().width);
    if (!w) return;
    var kids = track.children;
    for (var j = 0; j < kids.length; j++) {
      kids[j].style.flex = '0 0 ' + w + 'px';
    }
  }

  /* 12.08: раньше сдвиг трека считался как "индекс * ширина первого
     слайда" (step()) — единая, ОДИНАКОВАЯ ширина применялась ко ВСЕМ
     слайдам сразу. При flex-basis в % ширина слайда — дробное число
     пикселей, и у РАЗНЫХ слайдов браузер может округлить итоговый
     layout на доли пикселя по-разному (сумма долей не обязана быть
     кратной). Из-за этого "индекс * шаг" со временем расходился с
     реальной позицией слайда в разметке, и после нескольких
     перелистываний слева проступал край предыдущего фото (баг,
     о котором сообщил пользователь). Фикс: двигаем трек на
     ФАКТИЧЕСКИЙ offsetLeft нужного слайда (offsetFor) — это то самое
     число, которое использует сам браузер при раскладке, поэтому
     ошибка округления в принципе не может накопиться. step() оставлен
     только там, где нужна ПРИБЛИЗИТЕЛЬНАЯ ширина одного слайда (лимиты
     drag'а, определение ближайшего слайда при отпускании) — там точность
     до пикселя не критична. */
  function step() {
    var first = track.children[0];
    if (!first) return 0;
    var styles = window.getComputedStyle(track);
    var gap = parseFloat(styles.columnGap || styles.gap) || 0;
    return first.getBoundingClientRect().width + gap;
  }

  function offsetFor(i) {
    var el = track.children[i];
    return el ? el.offsetLeft : i * step();
  }

  /* 12.08, второй заход: клик по офсету слайда убирает НАКОПЛЕННЫЙ дрейф
     (см. комментарий выше), но не объясняет, почему край соседнего фото
     проскакивает именно ПОСЛЕ НЕСКОЛЬКИХ кликов, а не сразу — так себя
     ведёт именно normalize(): после того как анимация доводит до
     клона (края достигают после CLONES=3 кликов подряд в одну сторону),
     index незаметно «перепрыгивает» на реальный слайд БЕЗ анимации
     (instant=true). Раньше мгновенный прыжок гасился синхронным
     форс-reflow (getBoundingClientRect) между transition:none и
     обнулением transition — этого достаточно для layout/main thread,
     но GPU-композитор (track анимируется на своём слое из-за
     will-change: transform) иногда успевает отрисовать ОДИН кадр уже
     ПОСЛЕ снятия transition:none, но ДО того как реально применился
     новый transform — на этом кадре виден край клона со старой
     позиции. Двойной requestAnimationFrame — стандартный приём для
     подобных «бесшовных» каруселей: гарантирует, что браузер
     отрисовал кадр С НОВЫМ transform (и БЕЗ transition), и только
     после этого возвращает transition обратно. */
  /* 12.08, четвёртый заход: после серии быстрых кликов анимация могла
     вообще перестать возвращаться — даже если потом кликать медленно.
     Причина — гонка с двойным rAF выше: settle() внутри move() делает
     МГНОВЕННЫЙ прыжок (setTransform(px, true)) — тот выставляет
     transition:none и планирует его очистку через requestAnimationFrame
     (т.е. асинхронно, через 1-2 кадра). Но move() СРАЗУ ЖЕ после
     settle() синхронно вызывает apply(false) для НОВОГО слайда — а
     transition в этот момент ещё 'none' (запланированная очистка не
     успела сработать), поэтому "анимированный" переход тоже происходит
     мгновенно. Раз не было настоящего CSS-перехода — событие
     transitionend не срабатывает, animating так и остаётся true
     навсегда, и КАЖДЫЙ следующий клик (уже медленный) видит
     animating=true, снова дёргает settle() и попадает в ту же гонку.
     Фикс: НЕ-мгновенная ветка сама явно возвращает transition ДО того,
     как меняет transform — тогда анимация гарантированно включена в
     момент смены transform, независимо от того, успел ли сработать
     отложенный сброс из предыдущего мгновенного прыжка. */
  function setTransform(px, instant) {
    if (instant) {
      track.style.transition = 'none';
      track.style.transform = 'translate3d(' + px + 'px, 0, 0)';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          track.style.transition = '';
        });
      });
    } else {
      track.style.transition = '';
      track.style.transform = 'translate3d(' + px + 'px, 0, 0)';
    }
  }

  function apply(instant) {
    setTransform(-offsetFor(index), instant);
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

  function settle() {
    /* мгновенно довести текущее движение до конца */
    animating = false;
    apply(true);
    normalize();
  }

  function move(dir) {
    if (animating) settle();
    index += dir;
    animating = true;
    apply(false);
  }

  track.addEventListener('transitionend', function (e) {
    if (e.target !== track || e.propertyName !== 'transform') return;
    animating = false;
    normalize();
  });

  /* Кнопки — СНАРУЖИ root (root = [data-gallery], т.е. .projects__gallery/
     .docs-l__gallery; кнопки лежат в соседних .projects__intro/__bottom
     или .docs-l__intro/__bottom, общий родитель — вся секция целиком),
     поэтому ищем от родителя root, а не от самого root. */
  var scope = root.parentElement || document;
  var prevButtons = scope.querySelectorAll('[data-gallery-prev]');
  var nextButtons = scope.querySelectorAll('[data-gallery-next]');
  Array.prototype.forEach.call(prevButtons, function (btn) {
    btn.addEventListener('click', function () { move(-1); });
  });
  Array.prototype.forEach.call(nextButtons, function (btn) {
    btn.addEventListener('click', function () { move(1); });
  });

  /* ---- Drag-перелистывание (палец / мышь / стилус) ---- */
  var SWIPE_MIN = 40;   /* минимальный сдвиг для перелистывания, px */
  var DRAG_DEAD = 6;    /* меньше — считаем случайным касанием */
  var dragging = false;
  var dragPointerId = null;
  var dragStartX = 0;
  var dragStartOffset = 0;
  var dragDx = 0;
  var dragStep = 0;
  var dragMaxLeft = 0;  /* насколько можно утащить влево (dx < 0), px */
  var dragMaxRight = 0; /* насколько вправо (dx > 0), px */

  viewport.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (animating) settle();
    dragging = true;
    dragPointerId = e.pointerId;
    dragStartX = e.clientX;
    dragStep = step();
    dragStartOffset = -offsetFor(index);
    dragDx = 0;
    /* Пределы: позиция не должна выйти за реально существующие слайды
       (с учётом клонов и числа видимых), иначе в кадре будет пустота. */
    var total = realCount + 2 * CLONES;
    var visible = Math.max(
      1,
      Math.round(viewport.getBoundingClientRect().width / dragStep)
    );
    dragMaxLeft = (total - visible - index) * dragStep;
    dragMaxRight = index * dragStep;
    viewport.classList.add('is-dragging');
    track.style.transition = 'none';
    if (viewport.setPointerCapture) viewport.setPointerCapture(e.pointerId);
  });

  viewport.addEventListener('pointermove', function (e) {
    if (!dragging || e.pointerId !== dragPointerId) return;
    dragDx = e.clientX - dragStartX;
    if (dragDx < -dragMaxLeft) dragDx = -dragMaxLeft;
    if (dragDx > dragMaxRight) dragDx = dragMaxRight;
    track.style.transform =
      'translate3d(' + (dragStartOffset + dragDx) + 'px, 0, 0)';
  });

  function endDrag(e) {
    if (!dragging || (e && e.pointerId !== dragPointerId)) return;
    dragging = false;
    dragPointerId = null;
    viewport.classList.remove('is-dragging');
    track.style.transition = '';

    var s = dragStep || step();
    var target = index;
    if (Math.abs(dragDx) >= DRAG_DEAD) {
      /* к ближайшему слайду от точки отпускания… */
      target = Math.round(-(dragStartOffset + dragDx) / s);
      /* …а лёгкий, но уверенный свайп листает минимум на один */
      if (target === index && Math.abs(dragDx) >= SWIPE_MIN) {
        target = index + (dragDx < 0 ? 1 : -1);
      }
    }

    if (target === index) {
      /* возврат на место (или почти не двигали) */
      if (Math.abs(dragDx) < 1) {
        apply(true);
      } else {
        animating = true;
        apply(false);
      }
      return;
    }
    index = target;
    animating = true;
    apply(false);
  }

  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  /* нативный drag картинок мешает pointer-события мыши */
  track.addEventListener('dragstart', function (e) { e.preventDefault(); });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (dragging) return;
      animating = false;
      sizeSlides();
      apply(true);
      normalize();
    }, 100);
  });

  sizeSlides();
  apply(true);
  }
})();
