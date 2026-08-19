/* Кастомный "тяжёлый" скролл + упор в границы страницы на /home/
 * (04.08, по запросу пользователя после того, как он показал
 * https://menkind.co/ — там при быстром скролле в самый низ/верх
 * экран плавно тормозит и останавливается РОВНО у края документа, из-за
 * чего в браузере никогда не видно "родного" фона страницы за счёт
 * эластичного оверскролла (rubber-band на трекпаде/колесе). Проверено
 * в DevTools: у Menkind это Lenis (window.lenisVersion === "1.1.2"),
 * который берёт wheel-скролл под свой контроль и сам лерпит позицию
 * в пределах [0, maxScroll] — эластичный bounce браузера просто не
 * успевает возникнуть, потому что нативный wheel-скролл ни разу не
 * происходит "напрямую".
 *
 * Полноценный Lenis не подключаем (см. также комментарий в
 * header-home-theme.js о том же решении для параллакса Header):
 *   1) сайт до сих пор ничего не тянет с внешних CDN — даже шрифты
 *      специально самохостятся ("не зависим от внешнего сервиса, нет
 *      лишнего DNS/TLS запроса, работает офлайн"), тащить сюда внешний
 *      пакет ради одного эффекта нарушало бы этот же принцип;
 *   2) сама механика внутри Lenis для этого конкретного эффекта не
 *      сложнее того лёгкого lerp/rAF-подхода, что уже используется в
 *      header-home-theme.js — переиспользуем ровно ту же идею, просто
 *      применённую не к translateY Header'а, а к самому scrollY.
 *
 * Как это работает:
 *   - Слушаем 'wheel' (мышь/трекпад — это единственное событие,
 *     которое стреляет при физическом вращении колеса/свайпе трекпадом
 *     по стеклу; НЕ стреляет при обычном touch-скролле пальцем на
 *     экране телефона/планшета — там его в принципе нет в этом
 *     событии, так что мобильный/тач-скролл остаётся 100% нативным
 *     без каких-либо изменений, даже без явной проверки на touch).
 *   - preventDefault() у wheel — реальный нативный scrollTop браузера
 *     этим событием больше не двигаем вообще, вместо этого копим
 *     желаемую позицию (target) сами, кладя её в границы
 *     [0, maxScroll] через Math.max/Math.min — за эти границы target
 *     физически выйти не может.
 *   - На каждом кадре (rAF) текущая позиция (current) лерпится к
 *     target и применяется через window.scrollTo(0, current) — это
 *     НАСТОЯЩИЙ window.scrollY, все существующие scroll-обработчики
 *     страницы (header-home-theme.js, parallax.js) продолжают
 *     получать корректный window.scrollY/'scroll'-события без единой
 *     правки в них.
 *   - Раз target никогда не выходит за границы документа, а current
 *     всегда лерпится К target (никогда не "перелетает" его), реальный
 *     window.scrollTo() тоже никогда не просят прыгнуть за пределы —
 *     эластичный bounce браузеру просто неоткуда взять повод сработать.
 *
 * Якорные ссылки ("Кто мы" → #about, "Направления" → #areas в Hero) —
 * перехватываем клик и вместо нативного перехода по ссылке (который
 * использовал бы CSS scroll-behavior:smooth и дрался бы за scrollTop
 * с нашим rAF-циклом) сами выставляем target на позицию секции
 * (с тем же вычетом --header-height, что и scroll-margin-top в CSS) —
 * едет той же самой "тяжёлой" анимацией, что и обычный скролл.
 *
 * Если пользователь скроллит колёсиком мимо клика/драга скроллбара/
 * клавиатуры (Home/End/PageUp/PageDown/стрелки) — это НЕ проходит
 * через wheel и остаётся полностью нативным (мы их не трогаем), но
 * после такого "постороннего" скролла держим current/target
 * синхронизированными с реальным window.scrollY (см. resync() на
 * 'scroll'), чтобы следующий wheel-тик не дёрнул экран обратно к
 * старой, уже неактуальной цели.
 *
 * Только >=768px (тот же брейкпоинт, что у нового Header/hero-video —
 * т.е. там же, где на /home/ включается вообще вся "десктопная"
 * механика) и только при отсутствии prefers-reduced-motion — на
 * <768px, при reduced-motion, а на любых устройствах с touch-скроллом
 * (там wheel не стреляет) поведение остаётся ровно тем, что было. */
(function () {
  var mq = window.matchMedia('(min-width: 768px)');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  var LERP = 0.1; /* тот же порядок величины, что дефолт у Lenis (0.1) — "тяжёлый", но отзывчивый докат */
  var SETTLE_EPSILON = 0.5;

  var current = window.scrollY;
  var target = window.scrollY;
  var rafId = null;
  var animating = false; /* true, пока именно НАШ rAF двигает scrollTo — чтобы отличать это от "постороннего" скролла в resync() */

  function headerHeightPx() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--header-height');
    return parseFloat(v) || 72;
  }

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function resync() {
    /* Вызывается на нативном 'scroll', если он произошёл НЕ от нашего
       rAF (скроллбар мышью, клавиатура, якорь другого JS, back/forward) —
       подтягиваем наши current/target к реальности, иначе следующий
       wheel-тик посчитает дельту от устаревшей цели и экран дёрнется. */
    if (animating) return;
    current = window.scrollY;
    target = window.scrollY;
  }

  function tick() {
    var diff = target - current;
    if (Math.abs(diff) <= SETTLE_EPSILON) {
      current = target;
      animating = false;
      window.scrollTo(0, current);
      rafId = null;
      return;
    }
    animating = true;
    current += diff * LERP;
    window.scrollTo(0, current);
    rafId = window.requestAnimationFrame(tick);
  }

  function ensureLoop() {
    if (rafId === null) {
      rafId = window.requestAnimationFrame(tick);
    }
  }

  function normalizeDeltaY(e) {
    /* deltaMode: 0 = пиксели (обычно Chrome/трекпад), 1 = строки
       (обычно Firefox с обычной мышью), 2 = страницы — приводим к
       единому пиксельному масштабу, иначе в Firefox скролл колесом
       был бы в разы медленнее/быстрее трекпада. */
    if (e.deltaMode === 1) return e.deltaY * 16;
    if (e.deltaMode === 2) return e.deltaY * window.innerHeight;
    return e.deltaY;
  }

  function onWheel(e) {
    if (!mq.matches) return;
    e.preventDefault();
    /* 04.08, багфикс: реальный трекпад шлёт по несколько wheel-событий
       ЗА ОДИН кадр (rAF ещё не успел выполнить tick() и проставить
       animating=true) — раньше здесь было "if (!animating) { current =
       target = window.scrollY }", и это сбрасывало уже накопленную за
       этот же кадр цель обратно к текущей позиции при КАЖДОМ таком
       событии, кроме последнего. В синтетическом тесте (по одному
       wheel-событию за раз) это было незаметно, а на живом трекпаде
       съедало большую часть дистанции — ощущалось как "дико медленно".
       Теперь animating выставляется здесь же, синхронно, в момент
       первого события жеста — resync с реальным scrollY делает
       ИСКЛЮЧИТЕЛЬНО onScroll() (см. ниже), а не эта функция. */
    animating = true;
    target = clamp(target + normalizeDeltaY(e), 0, maxScroll());
    ensureLoop();
  }

  function onScroll() {
    if (!mq.matches) return;
    resync();
  }

  function onResize() {
    var max = maxScroll();
    target = clamp(target, 0, max);
    current = clamp(current, 0, max);
  }

  function scrollToTarget(y) {
    target = clamp(y, 0, maxScroll());
    ensureLoop();
  }

  /* Якорные ссылки Hero ("Кто мы" → #about, "Направления" → #areas) —
     ведём той же "тяжёлой" анимацией вместо нативного перехода. */
  function onClick(e) {
    if (!mq.matches) return;
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    var y = el.getBoundingClientRect().top + window.scrollY - headerHeightPx();
    scrollToTarget(y);
  }

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  document.addEventListener('click', onClick);
})();
