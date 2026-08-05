/* 05.08, дважды пересмотрено (см. подробный комментарий в style.css,
 * рядом с .overscroll-block-top):
 *
 * 1) Изначально overscroll-behavior-y: none стоял безусловно (весь
 *    документ) — блокировал "резиновый" отскок/мелькание фона при
 *    быстром флике к ЛЮБОЙ границе (верх/низ). Побочный эффект — на
 *    iOS Safari заодно пропал pull-to-refresh (тот же самый жест
 *    сверху).
 * 2) Пользователь отдельно попросил: у НИЗА страницы торможение вообще
 *    не нужно (в отличие от остальных страниц сайта, где обычный
 *    nativeBounce работает и это нравится) — смысл был только в
 *    верхней границе (эстетика прозрачного Header поверх видео Hero).
 *
 * Итог: overscroll-behavior-y теперь НЕ задан статически в CSS —
 * везде auto (обычный bounce, как на остальных страницах, включая низ
 * этой). Этот скрипт точечно включает блокировку (класс
 * .overscroll-block-top на body → overscroll-behavior-y: none) ТОЛЬКО
 * пока страница физически приближается к самому верху и ещё не
 * устоялась там — ровно тот момент, когда быстрый флик мог бы
 * "перелететь" границу и на долю секунды показать фон документа под
 * прозрачным Header. Как только страница либо (а) ушла от верха дальше
 * NEAR_TOP_PX, либо (б) уже спокойно стоит на scrollY=0 достаточно
 * долго (SETTLE_DELAY — отделяет докат/инерцию от нового отдельного
 * жеста) — класс снимается: в первом случае мы просто не у границы
 * (auto ничего не бounces), во втором — новый потягивающий жест
 * браузер обрабатывает как обычно, включая pull-to-refresh. */
(function () {
  var body = document.body;
  if (!body.classList.contains('body--header-overlay')) return;

  var BLOCK_CLASS = 'overscroll-block-top';
  var NEAR_TOP_PX = 120; /* запас, чтобы класс успел примениться ДО фактического касания границы даже на быстром флике */
  var SETTLE_DELAY = 150; /* мс — пауза, отделяющая докат от нового жеста */
  var settleTimer = null;

  function clearSettleTimer() {
    if (settleTimer) {
      clearTimeout(settleTimer);
      settleTimer = null;
    }
  }

  function onScroll() {
    var y = window.scrollY;

    if (y > NEAR_TOP_PX) {
      /* далеко от верха (в т.ч. весь путь до низа) — блокировка не
         нужна, auto и так ничего не bounce'ит вне границы */
      clearSettleTimer();
      body.classList.remove(BLOCK_CLASS);
      return;
    }

    /* y <= NEAR_TOP_PX — потенциальная зона "докат к верху" */
    if (!body.classList.contains(BLOCK_CLASS)) {
      body.classList.add(BLOCK_CLASS);
    }

    if (y === 0) {
      if (!settleTimer) {
        settleTimer = setTimeout(function () {
          settleTimer = null;
          if (window.scrollY === 0) {
            body.classList.remove(BLOCK_CLASS); /* разрешаем pull-to-refresh */
          }
        }, SETTLE_DELAY);
      }
    } else {
      clearSettleTimer();
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
