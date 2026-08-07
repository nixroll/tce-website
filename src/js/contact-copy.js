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
 * даём собственную обратную связь — на 1.2с подменяем текст кнопки на
 * data-copied-text ("Скопировано"), тот же приём, что и у кнопки
 * "Отправить" в форме (data-success-text, см. contact-form.js). */
(function () {
  var buttons = document.querySelectorAll('[data-copy-text]');
  if (!buttons.length) return;

  Array.prototype.forEach.call(buttons, function (btn) {
    var originalText = btn.textContent;
    var copiedText = btn.getAttribute('data-copied-text') || 'Скопировано';
    var revertTimer = null;

    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy-text');
      if (!text) return;

      var showCopied = function () {
        window.clearTimeout(revertTimer);
        btn.textContent = copiedText;
        revertTimer = window.setTimeout(function () {
          btn.textContent = originalText;
        }, 1200);
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
