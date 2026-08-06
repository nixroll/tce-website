/* 05.08. Contact - L / Form - L (node 937:4840): форма пока НИКУДА не
 * отправляется — по прямой просьбе пользователя ("Пока мы не
 * подключаем форму никуда"). Этот скрипт добавляет только два
 * клиентских штриха, оба явно попрошены:
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
 *    в contact.njk) и кнопка блокируется от повторной "отправки". */
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
  });
})();
