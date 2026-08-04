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
 * Момент переключения — не когда Header уже "наехал" на секцию (её
 * верх строго меньше нижней границы Header), а на 1px раньше: когда
 * расстояние между ними ещё только дошло до 0px (по просьбе
 * пользователя — раньше срабатывало на кадре, где Header уже был
 * "над первым пикселем" секции из-за дискретности скролл-события/
 * requestAnimationFrame; +1px компенсирует это и не даёт кадру со
 * "старой" темой проскочить). */
(function () {
  var header = document.querySelector('.site-header--home');
  if (!header) return;

  var candidates = document.querySelectorAll(
    '.social, .stats, .divider, .areas, .testimonial, .services, .projects, .brands, .cta, .site-footer'
  );
  if (!candidates.length) return;

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
      el.classList.contains('projects')
    ) {
      theme = 'light';
    } else {
      /* .testimonial, .brands, .cta, .site-footer */
      theme = 'dark';
    }
    return { el: el, theme: theme };
  });

  var mq = window.matchMedia('(min-width: 768px)');

  function headerHeightPx() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--header-height');
    return parseFloat(v) || 72;
  }

  function currentTheme() {
    var threshold = headerHeightPx() + 1; /* +1px — см. комментарий выше */
    var theme = 'transparent';
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].el.getBoundingClientRect().top <= threshold) {
        theme = sections[i].theme;
      } else {
        /* Секции идут в порядке документа сверху вниз — как только
           одна ещё не дошла до границы, все следующие тем более не
           дошли, дальше можно не проверять. */
        break;
      }
    }
    return theme;
  }

  var ticking = false;
  var current = null;

  function update() {
    ticking = false;
    if (!mq.matches) return;
    var theme = currentTheme();
    if (theme === current || !THEMES[theme]) return;
    current = theme;
    header.classList.remove('site-header--transparent', 'site-header--light', 'site-header--dark');
    header.classList.add('site-header--' + theme);
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
