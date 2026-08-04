/* Переключение темы нового прозрачного Header на /home/ (04.08,
 * п.3 запроса): "сразу открывается страница с прозрачным Header...
 * и ровно пока мы не доскролим до секции Social - L он будет
 * прозрачный, но как только Header коснётся секции Social - L
 * Header станет белого цвета". Header всё это время position:fixed
 * ("Fix" в терминологии запроса) — меняется только тема (фон/цвет),
 * не позиция.
 *
 * "Коснулся" — секция Social начинает заходить под нижний край
 * Header (её верхняя граница поднялась выше высоты Header). Считаем
 * на каждом скролле/ресайзе (как в areas-parallax.js — rAF-throttle,
 * без лишних синхронных reflow), переключаем модификатор темы в
 * обе стороны (скролл вверх обратно в Hero — снова прозрачный).
 *
 * Работает только >=768px: ниже "Mobile Header пока не трогаем" —
 * там Header всегда обычный (тема не подключена визуально, см.
 * @media в style.css), гонять здесь скролл-обработчик впустую
 * незачем. */
(function () {
  var header = document.querySelector('.site-header--home');
  var social = document.querySelector('.social');
  if (!header || !social) return;

  var mq = window.matchMedia('(min-width: 768px)');

  function headerHeightPx() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--header-height');
    return parseFloat(v) || 72;
  }

  var ticking = false;

  function update() {
    ticking = false;
    if (!mq.matches) return;
    var touching = social.getBoundingClientRect().top <= headerHeightPx();
    header.classList.toggle('site-header--light', touching);
    header.classList.toggle('site-header--transparent', !touching);
  }

  function onScrollOrResize() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize);
  mq.addEventListener('change', update);
  update();
})();
