/* 07.10 (Никита, ТЗ «секция отзывов (благодарственные письма)»):
 * слайдер Testimonial на Home — 10 благодарственных писем.
 *
 * Разметка — _includes/testimonial.njk (все 10 слайдов в HTML сразу,
 * без JS виден только первый, точки скрыты атрибутом hidden — снимаем
 * его здесь). Стили и анимация смены — style.css (.testimonial):
 * скрипт только переключает классы is-active / is-leaving, тайминги
 * кроссфейда живут в CSS.
 *
 * Автопереключение: AUTOPLAY_MS на слайд, по кругу. Таймер на
 * setTimeout с учётом остатка (не setInterval), идёт только когда:
 *   - секция видна хотя бы на 50% (IntersectionObserver), первый старт —
 *     только при попадании во вьюпорт, поэтому первое письмо видят первым;
 *   - вкладка видима (visibilitychange);
 *   - курсор мыши не над секцией и в ней нет клавиатурного фокуса
 *     (:focus-visible) — после ухода продолжает с остатка, не с нуля;
 *   - нет prefers-reduced-motion: reduce (тогда только ручное).
 * Клик по точке / свайп / стрелки — переход и полный сброс таймера.
 *
 * Свайп: только touch/pen, горизонтальный сдвиг > 40px и больше
 * вертикального. Вертикальный скролл не блокируем (touch-action: pan-y
 * в CSS). С pull-to-refresh.js (слушает только scroll) и social-drag.js
 * (только .social__track) не пересекается.
 *
 * Клавиатура: ← → когда фокус на точках. Скрытые слайды — inert +
 * tabindex="-1" на ссылке (фолбэк для браузеров без inert).
 * aria-live: "off" при автопереключении, "polite" после ручного.
 *
 * Точки — один блок на секцию (вне слайдов). Место под ними
 * зарезервировано паддингом у .testimonial__body; здесь только
 * считаем, на сколько точки поднять от низа .testimonial__stage, чтобы
 * они стояли под колонкой текста самого высокого слайда (на 1000+ текст
 * центрирован по окошку, и низ колонки не совпадает с низом сцены). */
(function () {
  'use strict';

  /* 07.10, вечер (Никита): 15 с на слайд вместо 7 из ТЗ. */
  var AUTOPLAY_MS = 15000;
  var LEAVE_MS = 250;
  var LEAVE_MS_REDUCED = 200;
  var SWIPE_MIN = 40;

  var root = document.querySelector('[data-testimonial]');
  if (!root) return;
  var stage = root.querySelector('.testimonial__stage');
  var slidesWrap = root.querySelector('[data-testimonial-slides]');
  var slides = Array.prototype.slice.call(root.querySelectorAll('[data-testimonial-slide]'));
  var dotsWrap = root.querySelector('[data-testimonial-dots]');
  var dots = dotsWrap ? Array.prototype.slice.call(dotsWrap.querySelectorAll('button')) : [];
  var n = slides.length;
  if (n < 2 || dots.length !== n || !stage || !slidesWrap) return;

  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduced = !!(mqReduce && mqReduce.matches);

  var current = 0;
  var leaveTimer = null;
  var leavingSlide = null;

  dotsWrap.hidden = false;

  /* ---------- состояние слайдов ---------- */
  function setInteractive(i, on) {
    var s = slides[i];
    var link = s.querySelector('a');
    if (on) {
      s.removeAttribute('inert');
      if (link) link.removeAttribute('tabindex');
    } else {
      s.setAttribute('inert', '');
      if (link) link.setAttribute('tabindex', '-1');
    }
  }

  function preload(i) {
    var img = slides[i] && slides[i].querySelector('img');
    if (!img) return;
    img.loading = 'eager';
    if (img.decode) img.decode().catch(function () {});
  }

  function finishLeave() {
    if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
    if (leavingSlide) { leavingSlide.classList.remove('is-leaving'); leavingSlide = null; }
  }

  function goTo(i, manual) {
    i = ((i % n) + n) % n;
    if (i === current) return;

    /* новый переход прерывает незавершённый: старый уход сразу
       заканчиваем, очередь анимаций не копится */
    finishLeave();

    var prev = slides[current];
    var next = slides[i];

    prev.classList.remove('is-active');
    prev.classList.add('is-leaving');
    leavingSlide = prev;
    setInteractive(current, false);
    dots[current].classList.remove('is-active');
    dots[current].removeAttribute('aria-current');

    current = i;

    /* reflow: дети нового слайда стартуют из «скрытого» состояния,
       даже если он только что сам уходил */
    void next.offsetWidth;
    next.classList.add('is-active');
    setInteractive(i, true);
    dots[i].classList.add('is-active');
    dots[i].setAttribute('aria-current', 'true');

    slidesWrap.setAttribute('aria-live', manual ? 'polite' : 'off');

    leaveTimer = setTimeout(finishLeave, reduced ? LEAVE_MS_REDUCED : LEAVE_MS);
    preload((i + 1) % n);
  }

  /* ---------- таймер ---------- */
  var timer = null;
  var remaining = AUTOPLAY_MS;
  var startedAt = 0;
  var inView = false;
  var hovered = false;
  var focused = false;
  var pageHidden = !!document.hidden;

  function canRun() {
    return !reduced && inView && !hovered && !focused && !pageHidden;
  }

  function start() {
    startedAt = Date.now();
    timer = setTimeout(function () {
      timer = null;
      remaining = AUTOPLAY_MS;
      goTo(current + 1, false);
      update();
    }, Math.max(remaining, 300));
  }

  function pause() {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    remaining = Math.max(0, remaining - (Date.now() - startedAt));
  }

  function update() {
    if (canRun()) { if (!timer) start(); }
    else pause();
  }

  function restart() {
    if (timer) { clearTimeout(timer); timer = null; }
    remaining = AUTOPLAY_MS;
    update();
  }

  /* видимость секции */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var vh = window.innerHeight || document.documentElement.clientHeight;
        /* «видна на 50%»: либо половина секции, либо секция занимает
           не меньше половины экрана (на случай, если она выше 2 экранов) */
        var visible = e.isIntersecting &&
          (e.intersectionRatio >= 0.5 || e.intersectionRect.height >= vh * 0.5);
        if (visible && !inView) preload((current + 1) % n);
        inView = visible;
      });
      update();
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    io.observe(root);
  } else {
    inView = true;
  }

  document.addEventListener('visibilitychange', function () {
    pageHidden = !!document.hidden;
    update();
  });

  /* ховер — только настоящая мышь (на таче pointerenter без leave
     заморозил бы автопереключение навсегда) */
  root.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'mouse') { hovered = true; update(); }
  });
  root.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse') { hovered = false; update(); }
  });

  /* фокус — только клавиатурный: клик мышью по точке тоже даёт фокус,
     но после него автопереключение должно продолжаться */
  function isKeyboardFocus(el) {
    try { return el.matches(':focus-visible'); } catch (err) { return true; }
  }
  root.addEventListener('focusin', function (e) {
    focused = isKeyboardFocus(e.target);
    update();
  });
  root.addEventListener('focusout', function (e) {
    if (!e.relatedTarget || !root.contains(e.relatedTarget)) {
      focused = false;
      update();
    }
  });

  if (mqReduce) {
    var onReduce = function () { reduced = mqReduce.matches; update(); };
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', onReduce);
    else if (mqReduce.addListener) mqReduce.addListener(onReduce);
  }

  /* ---------- точки и клавиатура ---------- */
  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () {
      goTo(i, true);
      restart();
    });
  });

  dotsWrap.addEventListener('keydown', function (e) {
    var step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    goTo(current + step, true);
    dots[current].focus();
    restart();
  });

  /* ---------- свайп ---------- */
  var sx = 0;
  var sy = 0;
  var tracking = false;
  var swiped = false;

  slidesWrap.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    tracking = true;
    swiped = false;
    sx = e.clientX;
    sy = e.clientY;
  }, { passive: true });

  slidesWrap.addEventListener('pointermove', function (e) {
    if (!tracking) return;
    var dx = e.clientX - sx;
    var dy = e.clientY - sy;
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) {
      tracking = false;
      swiped = true;
      goTo(current + (dx < 0 ? 1 : -1), true);
      restart();
    }
  }, { passive: true });

  function endTrack() { tracking = false; }
  slidesWrap.addEventListener('pointerup', endTrack);
  slidesWrap.addEventListener('pointercancel', endTrack);

  /* свайп начинался на миниатюре — не открываем PDF */
  slidesWrap.addEventListener('click', function (e) {
    if (swiped) {
      e.preventDefault();
      e.stopPropagation();
      swiped = false;
    }
  }, true);

  /* ---------- положение точек ---------- */
  var bodies = slides.map(function (s) { return s.querySelector('.testimonial__body'); });
  var rafId = 0;

  function layoutDots() {
    rafId = 0;
    var stageBottom = stage.getBoundingClientRect().bottom;
    var maxBottom = 0;
    bodies.forEach(function (b) {
      if (b) maxBottom = Math.max(maxBottom, b.getBoundingClientRect().bottom);
    });
    var offset = Math.max(0, Math.round(stageBottom - maxBottom));
    root.style.setProperty('--testimonial-dots-offset', offset + 'px');
  }

  function scheduleLayout() {
    if (!rafId) rafId = requestAnimationFrame(layoutDots);
  }

  layoutDots();
  window.addEventListener('resize', scheduleLayout);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleLayout).observe(stage);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleLayout);
})();
