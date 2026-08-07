/* 05.08. Contact - L / Form - L (node 937:4840): форма пока НИКУДА не
 * отправляется — по прямой просьбе пользователя ("Пока мы не
 * подключаем форму никуда"). Этот скрипт добавляет три клиентских
 * штриха, все явно попрошены:
 *
 * 1) "Документы" — реальный <input type="file"> (открывает системный
 *    пикер), визуально спрятан (.visually-hidden), кликабельная
 *    обёртка — <label>; после выбора файла подставляем его имя вместо
 *    плейсхолдера "Загрузить документ" (иначе выбор был бы совсем без
 *    обратной связи).
 * 2) Success-статус отправки: submit перехватывается, preventDefault
 *    (никакого реального запроса), дальше — нативная HTML5-валидация
 *    формы (form.checkValidity()); если обязательные поля/чекбокс не
 *    заполнены — отдаём управление браузеру (reportValidity(),
 *    подсветит проблемные поля как обычно), иначе имитируем успех:
 *    текст кнопки меняется на "Отправлено" (data-success-text, задан
 *    в contact.njk) и кнопка блокируется от повторной "отправки".
 * 3) 07.08, по референсу пользователя (significa.co/get-a-quote/, там
 *    свой самописный компонент под тем же паттерном) — конфетти при
 *    успешной отправке. Библиотека — canvas-confetti (см. confetti.js,
 *    грузится перед этим скриптом в base.njk), self-hosted, MIT.
 *
 *    Первая версия запускала конфетти из самой кнопки "Отправить" —
 *    пользователь посмотрел и попросил "по всему экрану" вместо этого.
 *    Теперь — канонический демо-приём самой библиотеки: серия залпов
 *    из ДВУХ НИЖНИХ УГЛОВ экрана (не абсолютных 0/1 — чуть отступя,
 *    иначе будет вылетать из-за края и половина конфетти пропадает не
 *    долетев) с широким spread и небольшим случайным разбросом X/Y на
 *    каждый залп, растянутая на CONFETTI_DURATION мс через setInterval
 *    — из-за широкого угла (spread: 360, т.е. частицы летят во все
 *    стороны от точки старта, а не веером в одном направлении) и двух
 *    противоположных источников частицы покрывают весь экран, а не
 *    только область у кнопки. zIndex выставлен явно выше z-index
 *    Header (100, см. .site-header) — иначе конфетти могло бы
 *    оказаться визуально ПОД фиксированной шапкой. disableForReducedMotion
 *    — уважает prefers-reduced-motion (тот же принцип, что и
 *    scroll-behavior в style.css).
 * 4) 07.08 — тост-уведомление (node 1027:4710, Type=Send), В ДОПОЛНЕНИЕ
 *    к пп.2 и 3 выше (текст кнопки + конфетти), не вместо них —
 *    прямая просьба пользователя. Общий контроллер с тостом
 *    "Скопировано" у карточки "Юридический адрес" — contact-toast.js
 *    (грузится раньше этого скрипта в base.njk), window.showContactToast('send'). */
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var fileInput = form.querySelector('input[type="file"]');
  var fileText = form.querySelector('.form__file-text');
  if (fileInput && fileText) {
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      fileText.textContent = file ? file.name : fileText.getAttribute('data-empty-text');
      fileText.classList.toggle('is-filled', !!file);
    });
  }

  var submitBtn = form.querySelector('.form__submit');

  var CONFETTI_DURATION = 2600; /* мс, суммарная продолжительность залпов */
  var CONFETTI_HEADER_Z = 1000; /* больше z-index Header (100, см. .site-header) — конфетти должно быть поверх */

  function fireConfetti() {
    if (typeof window.confetti !== 'function') return;

    /* Брендовый оранжевый (--brand) как основной цвет + несколько
       праздничных дополняющих — чисто оранжевое конфетти выглядело бы
       слишком монотонно. */
    var colors = ['#fdb022', '#fde68a', '#ff5e7e', '#22c55e', '#3b82f6'];

    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    var defaults = {
      colors: colors,
      startVelocity: 45,
      spread: 360,
      ticks: 90,
      zIndex: CONFETTI_HEADER_Z,
      disableForReducedMotion: true
    };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    var animationEnd = Date.now() + CONFETTI_DURATION;

    (function frame() {
      var timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) return;

      var particleCount = 40 * (timeLeft / CONFETTI_DURATION);

      /* Два одновременных залпа из противоположных нижних углов —
         из-за spread: 360 (во все стороны от точки) и разбегающихся
         навстречу друг другу источников частицы покрывают весь экран
         по ширине, а не только окрестность одной точки. */
      window.confetti(Object.assign({}, defaults, {
        particleCount: particleCount,
        origin: { x: randomInRange(0.05, 0.25), y: randomInRange(0.7, 0.9) }
      }));
      window.confetti(Object.assign({}, defaults, {
        particleCount: particleCount,
        origin: { x: randomInRange(0.75, 0.95), y: randomInRange(0.7, 0.9) }
      }));

      window.setTimeout(frame, 250);
    })();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (submitBtn) {
      submitBtn.textContent = submitBtn.getAttribute('data-success-text') || submitBtn.textContent;
      submitBtn.disabled = true;
    }

    fireConfetti();

    if (typeof window.showContactToast === 'function') {
      window.showContactToast('send');
    }
  });
})();
