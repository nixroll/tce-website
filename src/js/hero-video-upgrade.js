/* Прогрессивная (двухступенчатая) подгрузка фонового видео Home Hero —
 * запрос пользователя 04.08: "качество видео будто очень сжимается,
 * особенно на десктопе, как делают в мировых студиях?".
 *
 * Идея ровно та, что используют крупные студийные/агентские сайты для
 * фонового hero-видео (аналог LQIP у картинок, только для видео):
 *   1) Сразу проигрывается лёгкая версия (тот же файл, что был и
 *      раньше, ~1.1-1.2Mbps) — видео стартует мгновенно, ничего не
 *      ждёт.
 *   2) В фоне, ПОСЛЕ того как лёгкая версия уже начала идти, отдельно
 *      подгружается версия с более высоким битрейтом (~3-3.3Mbps,
 *      см. data-hq-* атрибуты на .home-hero__video в home.njk).
 *   3) Когда качественная версия набуферилась настолько, что готова
 *      играть без подвисаний, — бесшовно (кроссфейд, без перезапуска
 *      и рестарта с начала) подменяет собой лёгкую версию.
 *
 * Почему через два <video>, а не просто video.src = hqUrl:
 * смена .src у уже играющего <video> всегда means новую загрузку/
 * декодирование внутри ТОГО ЖЕ элемента — на секунду-две будет либо
 * чёрный кадр, либо стоп-кадр, пока буферизуется. Вместо этого HQ-
 * версия грузится и начинает играть в отдельном, невидимом (opacity:0)
 * <video> поверх исходного, и только когда она реально готова и уже
 * идёт синхронно — оба кросс-фейдятся (200ms), лёгкая версия
 * останавливается и удаляется. Заметного шва на глаз быть не должно.
 *
 * Полностью необязательный энхансмент: если что-то пошло не так
 * (ошибка загрузки, медленное соединение, старый браузер без нужных
 * событий) — скрипт просто тихо ничего не делает, пользователь как и
 * раньше смотрит лёгкую версию. Ничего не ломается.
 *
 * Как и areas-parallax.js, применяется ТОЛЬКО на /home/: скрипт
 * подключён в isHome-блоке base.njk (грузится и на index.njk тоже),
 * но живая "/" использует старый .hero-main__video, а не
 * .home-hero__video — без совпадения селектора скрипт сразу выходит,
 * так что на живую страницу это не влияет.
 *
 * Условия, при которых апгрейд НЕ запускается вовсе (пользователь
 * просто смотрит лёгкую версию, это нормально):
 *   - на .home-hero__video нет data-hq-* адреса под текущую ориентацию;
 *   - Save-Data включён в браузере или соединение помечено как
 *     медленное (navigator.connection.saveData / effectiveType);
 *   - prefers-reduced-data: reduce (где браузер это поддерживает). */
(function () {
  var media = document.querySelector('.home-hero__media');
  var lqVideo = media && media.querySelector('.home-hero__video');
  if (!media || !lqVideo) return;

  /* Экономим трафик на медленных/лимитированных соединениях —
   * пользователь и так получает вполне смотрибельное LQ-видео. */
  var connection =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    if (connection.saveData) return;
    if (/^(slow-2g|2g|3g)$/.test(connection.effectiveType || '')) return;
  }
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-data: reduce)').matches
  ) {
    return;
  }

  /* Та же граница брейкпоинта, что и у <source media> в разметке —
   * <video> не даёт узнать, какой source браузер выбрал сам, поэтому
   * ориентацию определяем тем же условием повторно. */
  var isNarrow = window.matchMedia('(max-width: 999.98px)').matches;
  var hqSrc = isNarrow ? lqVideo.dataset.hqVertical : lqVideo.dataset.hqHorizontal;
  if (!hqSrc) return;

  function startUpgrade() {
    var hqVideo = document.createElement('video');
    hqVideo.className = lqVideo.className;
    hqVideo.muted = true;
    hqVideo.loop = true;
    hqVideo.playsInline = true;
    hqVideo.preload = 'auto';
    hqVideo.tabIndex = -1;
    hqVideo.setAttribute('aria-hidden', 'true');
    hqVideo.style.opacity = '0';
    hqVideo.style.transition = 'opacity 0.2s ease';
    hqVideo.src = hqSrc;

    var settled = false;

    function cleanupFailed() {
      if (settled) return;
      settled = true;
      if (hqVideo.parentNode) hqVideo.parentNode.removeChild(hqVideo);
    }

    hqVideo.addEventListener('error', cleanupFailed);

    hqVideo.addEventListener(
      'canplaythrough',
      function () {
        if (settled) return;
        try {
          hqVideo.currentTime = lqVideo.currentTime || 0;
        } catch (e) {
          /* игнорируем — не критично, продолжит с начала */
        }
        var playResult = hqVideo.play();
        if (playResult && typeof playResult.then === 'function') {
          playResult.then(swap, cleanupFailed);
        } else {
          swap();
        }
      },
      { once: true }
    );

    function swap() {
      if (settled) return;
      settled = true;
      /* Двойной rAF — гарантия, что хотя бы один кадр HQ-видео уже
       * отрисован до начала кроссфейда (иначе можно словить мигание
       * пустым/прозрачным кадром). */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          hqVideo.style.opacity = '1';
          window.setTimeout(function () {
            lqVideo.pause();
            if (lqVideo.parentNode) lqVideo.parentNode.removeChild(lqVideo);
          }, 220);
        });
      });
    }

    lqVideo.insertAdjacentElement('afterend', hqVideo);
    hqVideo.load();
  }

  /* Апгрейд стартуем только после того, как лёгкая версия реально
   * начала идти — чтобы не соревноваться за полосу с самым первым,
   * критичным для восприятия кадром. */
  if (lqVideo.readyState >= 3) {
    startUpgrade();
  } else {
    lqVideo.addEventListener('playing', startUpgrade, { once: true });
  }
})();
