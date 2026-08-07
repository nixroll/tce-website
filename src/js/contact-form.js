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
 *    Origin — сама кнопка "Отправить" (переводим её getBoundingClientRect
 *    в доли ширины/высоты окна, как того просит API библиотеки), а не
 *    случайная точка экрана — ощущается как "вылетает из кнопки", а не
 *    "запускается откуда-то ещё". Два залпа (влево и вправо, зеркально
 *    по spread) вместо одного по центру — так плотность частиц выше и
 *    эффект читается как "взрыв", а не как один плоский веер в одну
 *    сторону. disableForReducedMotion — уважает prefers-reduced-motion
 *    (тот же принцип, что и scroll-behavior в style.css). */
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

  function fireConfetti() {
    if (typeof window.confetti !== 'function' || !submitBtn) return;

    var rect = submitBtn.getBoundingClientRect();
    var originX = (rect.left + rect.width / 2) / window.innerWidth;
    var originY = rect.top / window.innerHeight;

    /* Брендовый оранжевый (--brand) как основной цвет + несколько
       праздничных дополняющих — чисто оранжевое конфетти выглядело бы
       слишком монотонно. */
    var colors = ['#fdb022', '#fde68a', '#ff5e7e', '#22c55e', '#3b82f6'];

    var base = {
      colors: colors,
      disableForReducedMotion: true,
      startVelocity: 38,
      ticks: 200,
      gravity: 0.9,
      origin: { y: originY }
    };

    window.confetti(Object.assign({}, base, {
      particleCount: 60,
      angle: 60,
      spread: 55,
      origin: { x: Math.max(originX - 0.12, 0), y: originY }
    }));
    window.confetti(Object.assign({}, base, {
      particleCount: 60,
      angle: 120,
      spread: 55,
      origin: { x: Math.min(originX + 0.12, 1), y: originY }
    }));
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
  });
})();
