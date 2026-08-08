/* 05.08. Contact - L / Form - L (node 937:4840): форма пока НИКУДА не
 * отправляется — по прямой просьбе пользователя ("Пока мы не
 * подключаем форму никуда"). Этот скрипт добавляет клиентские штрихи,
 * все явно попрошены:
 *
 * 1) 08.08 — плавающий label у полей ввода (node 1052:7544/1063:7731,
 *    подробности в contact.njk рядом с разметкой формы): пока поле
 *    пустое, .form__input-label визуально играет роль плейсхолдера;
 *    как только появляется значение, класс .has-value на обёртке
 *    .form__input переключает CSS-переход на маленькую подпись сверху
 *    + раскрывшееся поле под ней. Синхронизация по input (обычный
 *    ввод) — этого достаточно почти всегда, НО автозаполнение браузера
 *    не всегда бьёт input сразу/надёжно, поэтому дополнительно: (а)
 *    проверка сразу при загрузке скрипта — на случай, если браузер уже
 *    что-то подставил ДО того, как скрипт с defer выполнился, (б)
 *    'change' — подстраховка для автозаполнения/автосохранённых
 *    значений, которые иногда бьют только change, не input, (в)
 *    window 'pageshow' — переоткрытие страницы из bfcache (кнопка
 *    "назад" в браузере) с уже заполненной формой, но БЕЗ повторного
 *    выполнения скрипта с нуля. Ошибка (is-invalid) — вешается на
 *    blur, если поле не прошло нативную валидацию, снимается сразу
 *    при вводе, как только поле снова валидно.
 * 2) Success-статус отправки: submit перехватывается, preventDefault
 *    (никакого реального запроса), дальше — нативная HTML5-валидация
 *    формы (form.checkValidity()); если обязательные поля/чекбокс не
 *    заполнены — подсвечиваем все невалидные поля (is-invalid, та же
 *    красная State=Error из Figma) И отдаём управление браузеру
 *    (reportValidity(), подсветит проблемные поля нативным способом
 *    тоже — не убираем, доступность/скринридеры), иначе имитируем
 *    успех: текст кнопки меняется на "Отправлено" (data-success-text,
 *    задан в contact.njk; меняем ТОЛЬКО .form__submit-text, не весь
 *    button.textContent — там теперь ещё иконка mail-01 рядом,
 *    задевать её нельзя) и кнопка блокируется от повторной "отправки".
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

  var floatWrappers = form.querySelectorAll('[data-field]');

  function syncField(wrapper) {
    var field = wrapper.querySelector('.form__input-field');
    if (!field) return;
    wrapper.classList.toggle('has-value', field.value.length > 0);
  }

  Array.prototype.forEach.call(floatWrappers, function (wrapper) {
    var field = wrapper.querySelector('.form__input-field');
    if (!field) return;

    syncField(wrapper); /* уже что-то подставлено до выполнения скрипта */

    field.addEventListener('input', function () {
      syncField(wrapper);
      if (field.validity.valid) {
        wrapper.classList.remove('is-invalid');
      }
    });
    field.addEventListener('change', function () { syncField(wrapper); }); /* автозаполнение */
    field.addEventListener('blur', function () {
      wrapper.classList.toggle('is-invalid', !field.validity.valid);
    });
  });

  window.addEventListener('pageshow', function () {
    Array.prototype.forEach.call(floatWrappers, syncField);
  });

  var submitBtn = form.querySelector('.form__submit');
  var submitBtnText = form.querySelector('.form__submit-text');

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
      Array.prototype.forEach.call(floatWrappers, function (wrapper) {
        var field = wrapper.querySelector('.form__input-field');
        if (field) wrapper.classList.toggle('is-invalid', !field.validity.valid);
      });
      form.reportValidity();
      return;
    }

    if (submitBtn && submitBtnText) {
      submitBtnText.textContent = submitBtn.getAttribute('data-success-text') || submitBtnText.textContent;
      submitBtn.disabled = true;
    }

    fireConfetti();

    if (typeof window.showContactToast === 'function') {
      window.showContactToast('send');
    }
  });
})();
