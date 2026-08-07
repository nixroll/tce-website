/* 07.08. Contact - L (node 924:9666): клик по карточке "Юридический
 * адрес" копирует адрес в буфер обмена (по просьбе пользователя — в
 * отличие от "Физический адрес", который ведёт на Яндекс.Карты
 * обычной ссылкой, юридический адрес не точка на карте, поэтому для
 * него вместо ссылки — кнопка-копирование, см. contact.njk).
 *
 * Браузеры НЕ дают вызвать свой системный тост "Скопировано" из
 * скрипта — то системное уведомление работает только для нативного
 * копирования (Cmd/Ctrl+C, лонг-тап "Копировать" в контекстном меню),
 * а не для programmatic navigator.clipboard.writeText(). Вместо этого
 * даём собственную обратную связь.
 *
 * 07.08, обновлено: раньше здесь на 1.2с подменялся текст самой
 * кнопки — пользователь посмотрел и попросил вместо этого показывать
 * тост-уведомление (node 1027:4710, "Notification", Type=Copy), тот
 * же компонент, что и у успешной отправки формы (contact-form.js,
 * там — Type=Send, добавляется В ДОПОЛНЕНИЕ к тексту кнопки, а не
 * вместо; здесь наоборот — тост ВМЕСТО подмены текста). Общий
 * контроллер — contact-toast.js (грузится раньше этого скрипта в
 * base.njk), window.showContactToast('copy'). */
(function () {
  var buttons = document.querySelectorAll('[data-copy-text]');
  if (!buttons.length) return;

  Array.prototype.forEach.call(buttons, function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy-text');
      if (!text) return;

      var showCopied = function () {
        if (typeof window.showContactToast === 'function') {
          window.showContactToast('copy');
        }
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(showCopied, function () {
          /* Clipboard API недоступен (напр. страница открыта не по
             https, или разрешение не дано) — тихо ничего не делаем,
             без обратной связи об ошибке (не критичная функция). */
        });
      } else {
        /* Совсем старый браузер без Clipboard API — запасной путь
           через скрытый textarea + document.execCommand. */
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          showCopied();
        } catch (err) {
          /* тихо игнорируем */
        }
        document.body.removeChild(ta);
      }
    });
  });
})();
