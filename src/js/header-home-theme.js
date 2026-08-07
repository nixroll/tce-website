/* Переключение темы нового Header на /home/ (04.08).
 *
 * Изначально (первая версия скрипта) отслеживалась только одна
 * граница — Hero/Social. Пользователь уточнил: так до самого конца
 * страницы, в зависимости от того, какая секция сейчас "под" Header —
 * светлая ("- L" в названии слоя в Figma) или тёмная ("- D") — Header
 * должен становиться светлым или тёмным соответственно. Всё это
 * размечено в Figma прямо в названиях (node 405:2033 "Home",
 * проверено через get_metadata на брейкпоинте 1440 — полный список
 * секций сверху вниз и их тема ниже).
 *
 * Соответствие секций и тем (сверху вниз, Figma node 405:2033):
 *   Home Hero            — не входит в список, это дефолт до первой
 *                           найденной секции (тема "transparent")
 *   Social - L            → light   (.social)
 *   Stats - L              → light   (.stats)
 *   Divider - L             → light   (.divider.divider--light)
 *   Areas - L               → light   (.areas)
 *   Divider - L              → light   (.divider.divider--light)
 *   Divider - D               → dark    (.divider, без модификатора)
 *   Testimonial (без суффикса, но зажат между Divider - D с обеих
 *   сторон — тёмная)          → dark    (.testimonial)
 *   Divider - D                → dark    (.divider)
 *   Services - L                 → light   (.services)
 *   Divider - L                   → light   (.divider.divider--light)
 *   Projects - L                    → light   (.projects)
 *   Divider - L                      → light   (.divider.divider--light)
 *   Brands - D                        → dark    (.brands)
 *   Divider - D                        → dark    (.divider)
 *   CTA - D                              → dark    (.cta)
 *   Divider - D (edge-secondary)          → dark    (.divider)
 *   Footer - D                             → dark    (.site-footer)
 *
 * Дивайдеры визуально неотличимы друг от друга по классу (все светлые
 * — .divider--light, все тёмные — просто .divider) — но для алгоритма
 * это не важно: секции собираются через querySelectorAll в порядке
 * документа (= порядку на странице), поэтому даже несколько
 * одинаковых по классу дивайдеров корректно занимают свои места по
 * порядку следования в разметке, без необходимости их различать
 * поимённо.
 *
 * Для ВСЕХ переходов, начиная с Social-L и ниже (Stats/Areas/
 * Testimonial/...), сохранён исходный простой механизм: как только
 * секция дошла до нижней границы Header (+1px запаса — раньше
 * срабатывало на кадре, где Header уже был "над первым пикселем"
 * секции из-за дискретности scroll/rAF), класс темы переключается,
 * дальше цвет плавно кроссфейдится 0.25s (см. style.css).
 *
 * 04.08, отдельное уточнение пользователя (изучили menkind.co): ТОЛЬКО
 * самый первый переход, Hero→Social-L, теперь устроен иначе —
 * повторяет механику Menkind:
 *   1) Пока Header ещё не долистали до Social — он медленно "сносится"
 *      вверх (translateY), с явно МЕНЬШЕЙ скоростью, чем скроллится
 *      страница (коэффициент DRIFT_K = 0.2, т.е. в 5 раз медленнее) —
 *      этим и достигается то самое "будто ниже скорости скролла"
 *      ощущение. Замерено у них через getComputedStyle/inline-style на
 *      живом сайте (DevTools): у них тот же коэффициент, линейно, без
 *      всякого easing — сглаженность там даёт не сам transform, а
 *      их Lenis (smooth-scroll библиотека на весь сайт, сглаживает
 *      сам scrollY). Полноценный Lenis себе не тащим (это меняло бы
 *      поведение скролла всего сайта, а остальная механика Header
 *      пользователя устраивает) — вместо этого ниже используется
 *      лёгкое экспоненциальное сглаживание (lerp) самого applied-
 *      значения на каждом кадре: даёт похожее ощущение "с накатом",
 *      никак не затрагивая нативный скролл.
 *   2) Когда снос дотягивает Header до состояния "уже скрыт за верхним
 *      краем" (т.е. до зоны RECOVERY_WINDOW перед реальным касанием
 *      Social) — цвет мгновенно (БЕЗ fade — см. .site-header--no-
 *      transition в style.css) переключается на светлый. Момент
 *      подобран так, что Header в этот момент не виден на экране —
 *      сам "скачок" цвета зритель не видит (ровно тот же трюк, что
 *      подсмотрен у Menkind: у них цвет тоже переключается мгновенно,
 *      но ровно в момент, когда translateY уже далеко за пределами
 *      высоты Header).
 *   3) Дальше, по мере того как Social дотягивается до Header, тот же
 *      translateY быстро (короче дистанция, чем при сносе вверх)
 *      возвращается к 0 — уже СВЕТЛЫЙ Header визуально "выезжает"
 *      сверху вниз на своё место.
 * Как только Social реально коснулась Header (gap <= 0) — управление
 * полностью передаётся обычному механизму выше (без transform,
 * обычный кроссфейд) для всех дальнейших секций до самого конца
 * страницы.
 *
 * 05.08: раньше вся эта логика (весь файл) работала только на
 * >=768px — "Mobile Header пока не трогаем" было действующим ТЗ,
 * матчился matchMedia('(min-width: 768px)') и ниже него скрипт
 * просто ничего не делал. Теперь пользователь явно попросил то же
 * поведение и на мобилке (node 384:2287) — проверку по ширине убрали
 * полностью, скрипт активен на любом брейкпоинте одинаково.
 *
 * Плюс новое: <meta name="theme-color"> (см. base.njk, добавлен
 * только под transparentHeader — сейчас это живая "/", у архивной
 * /old-home/ тега нет) — на iOS
 * Safari область под "чёлкой"/статус-баром подсвечивается именно по
 * этому тегу. Пользователь заметил, что у Attio эта область всегда
 * светлая, даже когда Header прозрачный поверх тёмного Hero — то же
 * самое сделано и здесь: белая ВСЕГДА, кроме случаев, когда сам
 * Header реально тёмный (site-header--dark). Обновляется через
 * MutationObserver за classList Header'а — так одним местом
 * покрываются оба источника смены класса: наш собственный
 * setThemeClass() (скролл) И переключение .is-open из header.js
 * (открытие мобильного меню) — второе мы напрямую не вызываем, но
 * поймать нужно и его, т.к. по требованию пользователя открытая
 * панель у прозрачного Header выглядит белой (см. style.css,
 * .site-header--home.site-header--transparent.is-open), а значит и
 * статус-бар над ней должен посветлеть, хотя тема (--transparent)
 * формально не меняется. */
(function () {
  var header = document.querySelector('.site-header--home');
  if (!header) return;

  var social = document.querySelector('.social');

  /* 05.08: .contact/.form добавлены — то же самое расширение, которое
     было анонсировано ниже в комментарии про "если позже на этих
     страницах появятся светлые секции" — теперь есть (Contact - L/
     Form - L на странице /contact/). */
  var candidates = document.querySelectorAll(
    '.social, .stats, .divider, .areas, .testimonial, .services, .projects, .brands, .cta, .site-footer, .contact, .form'
  );
  if (!candidates.length) return;

  /* 05.08: фон документа (см. .is-footer-bottom в style.css) у самого
     низа страницы должен совпадать с цветом Footer, а не оставаться
     светлым, как везде выше — иначе виден стык в safe-area под
     домашним индикатором iOS. Footer — последний элемент в разметке,
     поэтому как только он хоть немного показался снизу экрана, весь
     "хвост" документа до самого конца гарантированно попадает в его
     тёмную область. */
  var footerEl = document.querySelector('.site-footer');
  if (footerEl && 'IntersectionObserver' in window) {
    var footerObserver = new IntersectionObserver(
      function (entries) {
        document.body.classList.toggle('is-footer-bottom', entries[0].isIntersecting);
      },
      { threshold: 0 }
    );
    footerObserver.observe(footerEl);
  }

  var THEMES = { transparent: 1, light: 1, dark: 1 };

  var sections = Array.prototype.map.call(candidates, function (el) {
    var theme;
    if (el.classList.contains('divider')) {
      theme = el.classList.contains('divider--light') ? 'light' : 'dark';
    } else if (
      el.classList.contains('social') ||
      el.classList.contains('stats') ||
      el.classList.contains('areas') ||
      el.classList.contains('services') ||
      el.classList.contains('projects') ||
      el.classList.contains('contact') ||
      el.classList.contains('form')
    ) {
      theme = 'light';
    } else {
      /* .testimonial, .brands, .cta, .site-footer */
      theme = 'dark';
    }
    return { el: el, theme: theme };
  });

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Параметры menkind-эффекта — подобраны визуально по замерам живого
     сайта (DRIFT_K) и по высоте Header (RECOVERY_WINDOW), можно
     подстроить на глаз после ревью. */
  var DRIFT_K = 0.2; /* во сколько раз медленнее скролла едет Header вверх */
  /* 05.08, пользователь: при быстром скролле выезд белого Header
     ощущался резким — окно "заезда обратно" (2.5 высоты Header,
     ~160px при текущей высоте 64px) на быстром флике проматывалось
     буквально за 2-3 кадра, smoothedY физически не успевал плавно
     догнать target — тот сам скакал огромными шагами кадр к кадру.
     Увеличили окно (даёт больше пикселей скролла = больше кадров
     на анимацию при любой скорости флика) и заодно чуть утяжелили
     сам lerp — оба вместе дают ощутимо более плавный, начинающийся
     раньше выезд, не только на медленном скролле. */
  var RECOVERY_WINDOW_RATIO = 4.5; /* окно "заезда обратно", в высотах Header */
  var SMOOTH = 0.15; /* lerp-коэффициент сглаживания (0..1, больше — резче) */

  function headerHeightPx() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--header-height');
    return parseFloat(v) || 72;
  }

  var metaThemeColor = document.querySelector('meta[name="theme-color"]');
  var DARK_COLOR = '#181818'; /* var(--background-secondary) */
  var LIGHT_COLOR = '#ffffff'; /* var(--white) — используется и для Light, и для Home Hero (см. комментарий выше) */

  function syncMetaThemeColor() {
    if (!metaThemeColor) return;
    metaThemeColor.setAttribute(
      'content',
      header.classList.contains('site-header--dark') ? DARK_COLOR : LIGHT_COLOR
    );
  }

  /* Ловит смену темы (наш setThemeClass) И is-open (header.js) —
     единая точка синхронизации статус-бара, см. комментарий вверху
     файла. */
  new MutationObserver(syncMetaThemeColor).observe(header, {
    attributes: true,
    attributeFilter: ['class'],
  });
  syncMetaThemeColor();

  function setThemeClass(theme, instant) {
    if (instant) {
      header.classList.add('site-header--no-transition');
      header.classList.remove('site-header--transparent', 'site-header--light', 'site-header--dark');
      header.classList.add('site-header--' + theme);
      /* форсируем reflow, чтобы отключённый transition точно
         применился ДО смены класса темы, а не после */
      void header.offsetWidth;
      window.requestAnimationFrame(function () {
        header.classList.remove('site-header--no-transition');
      });
    } else {
      header.classList.remove('site-header--transparent', 'site-header--light', 'site-header--dark');
      header.classList.add('site-header--' + theme);
    }
  }

  /* 05.08: раньше скрипт грузился только на transparentHeader-странице
     (живая /), поэтому дефолт "пока ничего не докрутили" мог быть
     жёстко 'transparent'. body--header-overlay ставится в base.njk той
     же переменной transparentHeader, что и стартовый класс Header —
     самый надёжный способ узнать это в JS без отдельного флага.

     07.08, багфикс (пользователь, Safari mobile/Mac/iPad: "при быстром
     скролле на секунду переключается на тёмный Header", не
     воспроизводилось в Chrome): раньше дефолт для страниц БЕЗ
     transparentHeader был жёстко 'dark' — это был fallback ТОЛЬКО на
     случай, если currentTheme() ниже не найдёт вообще ни одной секции
     с top <= threshold (т.е. страница выше самой первой секции). На
     /contact/ первая секция (.contact) светлая и практически всегда
     удовлетворяет этому условию — НО в Safari при быстром флик-скролле
     getBoundingClientRect() иногда на один кадр отдаёт устаревшее
     значение (не успевает за реальной позицией скролла, известная
     особенность тайминга layout/rAF у WebKit при инерционном скролле —
     в Chrome не воспроизводится) — на этот один кадр цикл ниже не
     находил ни одной подходящей секции и откатывался на жёстко
     'dark' — отсюда видимая вспышка. Теперь дефолт берётся из темы
     САМОЙ ПЕРВОЙ найденной секции на странице (sections[0].theme) —
     на /contact/ это 'light', так что даже на том самом "потерянном"
     кадре Safari фон fallback совпадает с уже видимой темой и вспышки
     не видно. */
  var DEFAULT_THEME = document.body.classList.contains('body--header-overlay')
    ? 'transparent'
    : (sections.length ? sections[0].theme : 'dark');

  function currentTheme() {
    var threshold = headerHeightPx() + 1;
    var theme = DEFAULT_THEME;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].el.getBoundingClientRect().top <= threshold) {
        theme = sections[i].theme;
      } else {
        break;
      }
    }
    return theme;
  }

  var current = null; /* последняя применённая тема (общий механизм, после hero-фазы) */
  var heroSwapped = false; /* уже переключили на light в offscreen-момент этого захода? */
  var smoothedY = 0; /* сглаженное (lerp) значение translateY */
  var SETTLE_EPSILON = 0.05;

  function heroPhase() {
    /* Возвращает { inHero, settled }: inHero — Header ещё "в зоне
       ответственности" menkind-эффекта (Social ещё не коснулась);
       settled — smoothedY уже практически догнал цель (можно
       останавливать rAF-цикл до следующего скролла). */
    if (!social || reducedMotion) {
      return { inHero: false, settled: true };
    }
    var H = headerHeightPx();
    var gap = social.getBoundingClientRect().top - H;
    if (gap <= 0) {
      return { inHero: false, settled: true };
    }

    var recoveryWindow = H * RECOVERY_WINDOW_RATIO;
    var targetY;
    if (gap > recoveryWindow) {
      /* Фаза 1: медленный снос вверх, ещё прозрачный. Обрабатывает и
         обратный скролл: если до этого уже успели переключиться на
         light (фаза 2) и теперь снова поднимаемся выше recoveryWindow —
         возвращаем прозрачную тему, тоже мгновенно (в этой точке
         Header всё ещё почти полностью скрыт за верхним краем — как
         и при переключении вперёд, скачок цвета не виден). */
      targetY = -DRIFT_K * window.scrollY;
      if (current !== 'transparent') {
        setThemeClass('transparent', true);
        current = 'transparent';
      }
      heroSwapped = false;
    } else {
      /* Фаза 2: "заезд" обратно на 0 по мере приближения Social */
      if (!heroSwapped) {
        setThemeClass('light', true);
        heroSwapped = true;
        current = 'light';
      }
      var progress = 1 - gap / recoveryWindow; /* 0 на входе в окно, 1 у gap=0 */
      if (progress < 0) progress = 0;
      if (progress > 1) progress = 1;
      var entryY = -DRIFT_K * (window.scrollY - (recoveryWindow - gap)); /* значение сноса в момент входа в окно, пересчитанное без резкого скачка */
      targetY = entryY * (1 - progress);
    }

    var settled = Math.abs(targetY - smoothedY) <= SETTLE_EPSILON;
    smoothedY += (targetY - smoothedY) * SMOOTH;
    header.style.transform = 'translateY(' + smoothedY.toFixed(2) + 'px)';
    return { inHero: true, settled: settled };
  }

  /* heroPhase() лерпит smoothedY к цели КАЖДЫЙ кадр — чтобы догон
     (сглаживание) реально доигрывался, а не замирал на значении
     последнего scroll-события, нужен НЕПРЕРЫВНЫЙ rAF-цикл, а не
     разовый вызов на каждое событие (как у остального механизма
     ниже по странице — там достаточно одного пересчёта на событие,
     никакого сглаживания нет). Цикл сам себя останавливает, как
     только либо Header вышел из hero-зоны (gap <= 0), либо просто
     нет скролла и smoothedY уже сошёлся к своей текущей цели (иначе
     он крутился бы бесконечно даже когда страница неподвижна на
     самом верху) — следующий scroll/resize снова его будит. */
  var rafId = null;

  function tick() {
    rafId = null;
    var state = heroPhase();

    if (!state.inHero) {
      header.style.transform = '';
      smoothedY = 0;
      var theme = currentTheme();
      if (theme !== current && THEMES[theme]) {
        current = theme;
        setThemeClass(theme, false);
      }
    }

    if (!state.settled) {
      rafId = window.requestAnimationFrame(tick);
    }
  }

  function ensureLoop() {
    if (rafId === null) {
      rafId = window.requestAnimationFrame(tick);
    }
  }

  window.addEventListener('scroll', ensureLoop, { passive: true });
  window.addEventListener('resize', ensureLoop);
  ensureLoop();

  /* 05.08, ещё один баг-фикс: открытие/закрытие мобильного меню
     переключает .is-open (header.js, общий с живой "/" — не трогаем),
     а фон прозрачного Header при этом меняется transparent → white
     через тот же .25s transition, что и обычная смена темы по
     скроллу — из-за этого казалось, что панель открывается/
     закрывается "с плавной перекраской". У Light/Dark тем это
     незаметно (там фон и так один и тот же что открыто что закрыто),
     но пользователь явно попросил, чтобы здесь тоже было мгновенно.
     Вешаем свой click-listener на тот же .header__burger и оборачиваем
     сам toggle (которым управляет header.js) уже существующим приёмом
     — .site-header--no-transition на один кадр (см. setThemeClass
     выше). Оба listener'а на одном элементе срабатывают синхронно в
     рамках одного и того же click-события без ухода в новый таск —
     порядок регистрации (наш добавлен позже) значения не имеет: до
     первого реального repaint класс no-transition уже выставлен
     вместе с is-open/без него. */
  var burger = header.querySelector('.header__burger');
  if (burger) {
    burger.addEventListener('click', function () {
      header.classList.add('site-header--no-transition');
      void header.offsetWidth;
      window.requestAnimationFrame(function () {
        header.classList.remove('site-header--no-transition');
      });
    });
  }
})();
