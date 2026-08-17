/* 05.08. Contact - L / Form - L (node 937:4840): форма пока НИКУДА не
 * отправляется — по прямой просьбе пользователя ("Пока мы не
 * подключаем форму никуда"). Этот скрипт добавляет клиентские штрихи,
 * все явно попрошены:
 *
 * 1) 08.08 — плавающий label у полей ввода (node 1052:7544/1063:7731,
 *    подробности в contact.njk/style.css рядом с разметкой формы):
 *    пока поле пустое, .form__input-label визуально играет роль
 *    плейсхолдера, при появлении значения — сжимается в маленькую
 *    подпись сверху. Изначально это переключалось классом .has-value,
 *    который вешал JS (syncField) по событиям input/change/pageshow —
 *    но входное поле при этом было полностью спрятано (opacity:0,
 *    height:0) пока пусто, поэтому у него не было видно родного
 *    мигающего курсора при клике (баг, на который указал пользователь,
 *    сверяясь с significa.co/get-a-quote/). Второй заход переделал
 *    это на чистый CSS: input/textarea теперь всегда видимы, у них
 *    настоящий (но невидимый) placeholder, переключение состояний —
 *    через родной :placeholder-shown (см. style.css). Он сам всегда
 *    синхронен с реальным значением поля, включая автозаполнение —
 *    поэтому вся JS-логика has-value/syncField/pageshow, которая была
 *    здесь, больше не нужна и убрана целиком.
 *
 *    08.08, багфикс (пользователь: "красная рамка просто так
 *    появляется, типа как в прототипировании Figma" — after первая
 *    версия вешала is-invalid прямо на blur ЛЮБОГО поля, из-за чего
 *    ошибка загоралась ещё во время обычного заполнения формы, просто
 *    от перехода к следующему полю, до всякой попытки отправить).
 *    Сверился с significa.co/get-a-quote/ (тот же референс, что и у
 *    конфетти) — там при blur невалидного поля (проверено вживую:
 *    ввести кривой email, кликнуть в соседнее поле) НИКАКОЙ ошибки не
 *    показывается вообще, подсветка появляется только по факту попытки
 *    отправить. Теперь так же: is-invalid включается ТОЛЬКО после
 *    первой попытки submit (см. submitAttempted ниже) — до этого
 *    момента blur вообще ничего не подсвечивает. После первой попытки
 *    live-подсказка остаётся полезной: blur продолжает подсвечивать
 *    ошибку в уже-тронутых полях, а input снимает её сразу, как
 *    только поле снова валидно — так пользователь не бьётся о ту же
 *    красную рамку повторно, поправляя поле.
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
 *    (грузится раньше этого скрипта в base.njk), window.showContactToast('send').
 * 5) 10.08 — Big Input (node 1063:7731) авто-растёт по контенту:
 *    пользователь убрал компонент Resize handle из Figma совсем,
 *    попросил вместо ручного resize + внутреннего скролла просто
 *    увеличивать высоту поля по числу строк. autoGrowTextarea() ниже
 *    — стандартный приём (height:auto затем height:scrollHeight, сброс
 *    в auto обязателен на каждый пересчёт, иначе scrollHeight не может
 *    уменьшиться при удалении текста — он всегда считается от ТЕКУЩЕЙ
 *    высоты бокса, а не от контента). CSS min-height (134px, см.
 *    style.css) не даёт полю стать меньше стартового состояния.
 *    Пересчёт также по window resize (с дебаунсом) — на другой
 *    ширине контейнера текст переносится иначе, число строк меняется,
 *    хотя сам textarea никто не трогал.
 * 6) 10.08 — телефон: type="tel" сам по себе уже переключает
 *    клавиатуру на цифровую на мобильных (понравилось пользователю),
 *    но не мешает ФИЗИЧЕСКИ ввести буквы с обычной клавиатуры/при
 *    вставке — убираю именно буквы (юникод-класс \p{L}, работает и
 *    для кириллицы), остальные символы (+, -, en-dash, пробелы,
 *    скобки и т.д.) не трогаю — пользователь прямо попросил их
 *    оставить. */
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var floatWrappers = form.querySelectorAll('[data-field]');
  var submitAttempted = false; /* до первой попытки отправить — blur ничего не подсвечивает, см. комментарий выше */

  Array.prototype.forEach.call(floatWrappers, function (wrapper) {
    var field = wrapper.querySelector('.form__input-field');
    if (!field) return;

    field.addEventListener('input', function () {
      if (field.validity.valid) {
        wrapper.classList.remove('is-invalid');
      }
    });
    field.addEventListener('blur', function () {
      if (!submitAttempted) return;
      wrapper.classList.toggle('is-invalid', !field.validity.valid);
    });
  });

  var autoGrowField = form.querySelector('.form__input-field--textarea');
  function autoGrowTextarea() {
    if (!autoGrowField) return;
    autoGrowField.style.height = 'auto'; /* сброс обязателен — иначе scrollHeight не уменьшится при удалении текста */
    autoGrowField.style.height = autoGrowField.scrollHeight + 'px';
  }
  if (autoGrowField) {
    autoGrowTextarea(); /* на случай, если уже что-то подставлено (bfcache/автозаполнение) до выполнения скрипта */
    autoGrowField.addEventListener('input', autoGrowTextarea);
    var autoGrowResizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(autoGrowResizeTimer);
      autoGrowResizeTimer = setTimeout(autoGrowTextarea, 100);
    });
  }

  var phoneField = document.getElementById('contact-phone');
  if (phoneField) {
    phoneField.addEventListener('input', function () {
      var pos = phoneField.selectionStart;
      var lettersBefore = (phoneField.value.slice(0, pos).match(/\p{L}/gu) || []).length;
      var cleaned = phoneField.value.replace(/\p{L}/gu, '');
      if (cleaned !== phoneField.value) {
        phoneField.value = cleaned;
        var newPos = pos - lettersBefore;
        phoneField.setSelectionRange(newPos, newPos);
      }
    });
  }

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
      submitAttempted = true;
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

    /* 10.08 (пользователь, скриншот significa.co: "когда форму
       отправили поля опять пустые, а у тебя остаются заполненные,
       будто не отправилось") — form.reset() возвращает все поля к
       пустому состоянию; плавающий label ничего дополнительно не
       требует (переключается сам через :placeholder-shown, реагирует
       на реальное value поля). Два ручных доп. шага: autoGrowTextarea()
       — reset не бьёт 'input', высота Big Input сама не пересчитается
       и останется растянутой под старый текст; submitAttempted = false
       — иначе следующий blur по уже опустевшему обязательному полю
       тут же подсветил бы его как ошибку сразу после "успешной"
       отправки, что выглядело бы странно. */
    form.reset();
    autoGrowTextarea();
    submitAttempted = false;
    Array.prototype.forEach.call(floatWrappers, function (wrapper) {
      wrapper.classList.remove('is-invalid');
    });

    fireConfetti();

    if (typeof window.showContactToast === 'function') {
      window.showContactToast('send');
    }
  });
})();
