/* 05.08. Интерактив ленты Social (.social__track, node 702:4876):
 * тянуть мышью в любую сторону, свайпать пальцем на тачскрине; при
 * отпускании лента едет по инерции в сторону броска (сила зависит от
 * скорости свайпа перед отпусканием), инерция плавно гаснет — и
 * гаснет она НЕ в ноль, а обратно в исходную медленную автопрокрутку
 * влево (ту же самую, что раньше была чистым CSS @keyframes
 * social-marquee, 42s linear infinite, см. style.css) — ровно как
 * попросил пользователь: "как закончится сила инерции, то опять
 * вернуться в ту сторону идти медленно".
 *
 * Физика — не honest impulse-симуляция, а простая и предсказуемая
 * модель: на каждом кадре скорость экспоненциально стремится к
 * постоянной AUTO_VELOCITY (а не к нулю), формула
 *   v = target + (v - target) * DECAY_PER_MS^dt
 * — это тот же мат. приём, что и обычное "ease towards target", применённый
 * к скорости, а не к позиции: сразу после отпускания v далеко от
 * target (быстрый бросок) — трек едет быстро, "лишняя" скорость сверх
 * target гаснет с каждым кадром, пока не останется только сама
 * AUTO_VELOCITY — и лента продолжает ехать медленно и бесконечно,
 * как раньше.
 *
 * CSS-анимацией из обработчиков указателя управлять нельзя, поэтому
 * при инициализации (если !prefers-reduced-motion) скрипт подхватывает
 * ТЕКУЩУЮ позицию @keyframes-анимации через getComputedStyle (чтобы
 * не было визуального прыжка в момент передачи управления), формит её
 * (animation: none инлайново) и дальше сам ведёт transform на каждом
 * requestAnimationFrame. Если prefers-reduced-motion — скрипт вообще
 * не трогает трек, остаётся штатное поведение из CSS (там анимация уже
 * отключена через @media (prefers-reduced-motion: reduce)), в том
 * числе никакого drag — это осознанное решение не добавлять лишнее
 * движение таким пользователям.
 *
 * Указатель — через Pointer Events (pointerdown/move/up/cancel +
 * setPointerCapture), единый код для мыши и тача, без дублирования
 * mouse/touch слушателей. */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var tracks = document.querySelectorAll('.social__track');
  if (!tracks.length) return;

  Array.prototype.forEach.call(tracks, initTrack);

  function initTrack(track) {
    var copyWidth = track.scrollWidth / 3; /* трек = 3 одинаковые копии ряда, см. комментарий выше .social__container */
    if (!copyWidth) return;

    var AUTO_DURATION_MS = 42000; /* совпадает с исходным social-marquee 42s linear */
    var AUTO_VELOCITY = -copyWidth / AUTO_DURATION_MS; /* px/мс, всегда влево — это "состояние покоя" для скорости */
    var DECAY_PER_MS = 0.9985; /* ~0.5с на половину затухания брошенной скорости к AUTO_VELOCITY — ощущается как плавная инерция, не рывок и не вязкость */
    var VELOCITY_WINDOW_MS = 100; /* скорость броска считаем по последним ~100мс движения перед отпусканием, а не по всему драгу */
    var FRAME_DT_CAP_MS = 48; /* защита от скачка позиции, если вкладка была в фоне */

    var position = readCurrentTranslateX(track);
    var velocity = AUTO_VELOCITY;
    var dragging = false;
    var pointerId = null;
    var lastX = 0;
    var samples = [];

    track.style.animation = 'none';
    track.style.transform = 'translate3d(' + position + 'px, 0, 0)';

    track.addEventListener('pointerdown', onPointerDown);
    track.addEventListener('dragstart', function (e) { e.preventDefault(); });

    requestAnimationFrame(function (t0) {
      var prevT = t0;
      requestAnimationFrame(function loop(now) {
        var dt = Math.min(now - prevT, FRAME_DT_CAP_MS);
        prevT = now;

        if (!dragging) {
          velocity = AUTO_VELOCITY + (velocity - AUTO_VELOCITY) * Math.pow(DECAY_PER_MS, dt);
          position = wrap(position + velocity * dt);
          track.style.transform = 'translate3d(' + position + 'px, 0, 0)';
        }

        requestAnimationFrame(loop);
      });
    });

    function readCurrentTranslateX(el) {
      var t = getComputedStyle(el).transform;
      if (!t || t === 'none') return 0;
      if (t.indexOf('matrix3d') === 0) {
        var p3 = t.slice(9, -1).split(',').map(parseFloat);
        return p3[12] || 0;
      }
      var m = t.match(/^matrix\(([^)]+)\)/);
      if (!m) return 0;
      var parts = m[1].split(',').map(parseFloat);
      return parts[4] || 0;
    }

    function wrap(pos) {
      /* держим позицию в (-copyWidth, 0], чтобы драг в любую сторону
         был бесконечным без накопления огромных чисел — копии
         идентичны, период ровно copyWidth */
      var m = pos % copyWidth;
      if (m > 0) m -= copyWidth;
      return m;
    }

    function onPointerDown(e) {
      if (pointerId !== null) return;
      pointerId = e.pointerId;
      dragging = true;
      track.classList.add('is-dragging');
      try { track.setPointerCapture(pointerId); } catch (err) {}
      lastX = e.clientX;
      samples = [{ t: performance.now(), x: lastX }];
      velocity = 0;

      track.addEventListener('pointermove', onPointerMove);
      track.addEventListener('pointerup', onPointerUp);
      track.addEventListener('pointercancel', onPointerUp);
    }

    function onPointerMove(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      var x = e.clientX;
      var t = performance.now();
      position = wrap(position + (x - lastX));
      track.style.transform = 'translate3d(' + position + 'px, 0, 0)';
      lastX = x;

      samples.push({ t: t, x: x });
      while (samples.length > 2 && t - samples[0].t > VELOCITY_WINDOW_MS) samples.shift();
    }

    function onPointerUp(e) {
      if (e.pointerId !== pointerId) return;
      dragging = false;
      track.classList.remove('is-dragging');
      try { track.releasePointerCapture(pointerId); } catch (err) {}
      pointerId = null;

      track.removeEventListener('pointermove', onPointerMove);
      track.removeEventListener('pointerup', onPointerUp);
      track.removeEventListener('pointercancel', onPointerUp);

      if (samples.length >= 2) {
        var first = samples[0];
        var last = samples[samples.length - 1];
        var dt = last.t - first.t;
        velocity = dt > 0 ? (last.x - first.x) / dt : 0;
      } else {
        velocity = 0;
      }
    }
  }
})();
