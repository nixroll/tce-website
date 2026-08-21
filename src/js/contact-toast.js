/* 07.08. Contact - L / Form - L: тост-уведомление (node 1027:4710,
 * "Notification", два варианта — Type=Copy/Type=Send). Общий
 * контроллер для двух мест на странице:
 *   - contact-copy.js (клик по "Юридический адрес" — копирование в
 *     буфер) — раньше там на 1.2с подменялся текст самой кнопки,
 *     теперь вместо этого показываем этот тост ("вместо того текста,
 *     что появляется сейчас", просьба пользователя);
 *   - contact-form.js (успешная "отправка" формы) — тост показывается
 *     В ДОПОЛНЕНИЕ к уже существующим эффектам (текст кнопки меняется
 *     на "Отправлено" + конфетти), не вместо них.
 *
 * Позиционирование (просьба пользователя, по брейкпоинтам):
 *   768px+ (768/1000/1440) — bottom-right, 20px от каждого края (см.
 *   .contact-toast ниже — сама разметка/CSS).
 *   <768px (320/390) — по центру снизу, 20px от низа.
 * Анимация — плавное появление снизу (translateY + opacity), держится
 * TOAST_DURATION мс (около того, что принято для тост-уведомлений —
 * 3с: достаточно, чтобы прочитать короткую фразу, не настолько долго,
 * чтобы раздражать), затем так же плавно исчезает. position: fixed —
 * не двигается при скролле (сам по себе уже не в потоке документа).
 *
 * 21.08 — третий вариант, ERROR: contact-form.js вызывает его, когда
 * реальная отправка формы (fetch на contact-send.php) не удалась —
 * сеть недоступна, сервер ответил ошибкой и т.п. Тот же контроллер,
 * просто третий пункт в тернарнике show() ниже разросся в switch. */
(function () {
  var toast = document.getElementById('contact-toast');
  if (!toast) return;

  var TOAST_DURATION = 3000;
  var TRANSITION_MS = 250; /* совпадает с transition в style.css */

  var hideTimer = null;
  var removeVisibleTimer = null;

  var COPY = { modifier: 'contact-toast--copy', text: 'Скопировано' };
  var SEND = { modifier: 'contact-toast--send', text: 'Отправлено' };
  var ERROR = { modifier: 'contact-toast--error', text: 'Не удалось отправить' };

  var textEl = toast.querySelector('.contact-toast__text');

  function show(variant) {
    window.clearTimeout(hideTimer);
    window.clearTimeout(removeVisibleTimer);

    toast.classList.remove('contact-toast--copy', 'contact-toast--send', 'contact-toast--error');
    toast.classList.add(variant.modifier);
    if (textEl) textEl.textContent = variant.text;

    /* Если тост уже показан (повторный клик до истечения таймера) —
       is-visible уже на месте, просто перезапускаем таймер скрытия
       ниже, без лишнего reflow-трюка (нужен только когда элемент был
       СКРЫТ и его показывают заново, см. else). */
    if (!toast.classList.contains('is-visible')) {
      /* форсируем reflow перед добавлением is-visible — иначе, если
         предыдущий показ только что убрал класс (см. hide()), браузер
         может схлопнуть добавление/удаление в один кадр и анимация
         появления не проиграется */
      void toast.offsetWidth;
      toast.classList.add('is-visible');
    }

    hideTimer = window.setTimeout(hide, TOAST_DURATION);
  }

  function hide() {
    toast.classList.remove('is-visible');
  }

  window.showContactToast = function (type) {
    var variant = SEND;
    if (type === 'copy') variant = COPY;
    else if (type === 'error') variant = ERROR;
    show(variant);
  };
})();
