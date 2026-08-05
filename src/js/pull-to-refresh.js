/* 05.08: возвращает pull-to-refresh на iOS Safari, не жертвуя
 * исходной целью overscroll-behavior-y: none (см. style.css) — не
 * видеть фон документа при быстром флике к границе.
 *
 * Идея: overscroll-behavior-y должен быть "none" всё время, ПОКА идёт
 * инерционный докат страницы к самому верху (иначе вернётся старый
 * баг — резиновый отскок и мелькание фона при быстром флике), и
 * "auto" — как только страница уже спокойно стоит на scrollY=0 и
 * пользователь начинает новый, отдельный жест "потянуть вниз".
 * Разница между этими двумя моментами — только во ВРЕМЕНИ (докат
 * заканчивается, наступает пауза, потом начинается новый жест), а не
 * в чём-то, что можно отличить через сам overscroll-behavior или
 * scroll-события напрямую. Поэтому: как только scrollY впервые дошёл
 * до 0, ждём SETTLE_DELAY мс тишины (scrollY всё ещё 0, новых
 * scroll-событий не было) и только потом ставим класс
 * .allow-pull-refresh на body — с этого момента браузер обрабатывает
 * следующий потягивающий жест как обычно (pull-to-refresh). Класс
 * снимается сразу при первом же scrollY>0 (в т.ч. до того как истёк
 * SETTLE_DELAY — тогда таймер просто отменяется и класс не
 * появляется). */
(function () {
  var body = document.body;
  if (!body.classList.contains('body--header-overlay')) return;

  var ALLOW_CLASS = 'allow-pull-refresh';
  var SETTLE_DELAY = 150; /* мс — пауза, отделяющая докат от нового жеста */
  var settleTimer = null;

  function onScroll() {
    if (window.scrollY > 0) {
      if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
      if (body.classList.contains(ALLOW_CLASS)) {
        body.classList.remove(ALLOW_CLASS);
      }
      return;
    }

    /* scrollY === 0 */
    if (settleTimer || body.classList.contains(ALLOW_CLASS)) return;
    settleTimer = setTimeout(function () {
      settleTimer = null;
      if (window.scrollY === 0) {
        body.classList.add(ALLOW_CLASS);
      }
    }, SETTLE_DELAY);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
