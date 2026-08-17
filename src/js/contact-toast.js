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
 * не двигается при скролле (сам по себе уже не в потоке документа). */
(function () {
  var toast = document.getElementById('contact-toast');
  if (!toast) return;

  var TOAST_DURATION = 3000;
  var TRANSITION_MS = 250; /* совпадает с transition в style.css */

  var hideTimer = null;
  var removeVisibleTimer = null;

  var COPY = { modifier: 'contact-toast--copy', text: 'Скопировано' };
  var SEND = { modifier: 'contact-toast--send', text: 'Отправлено' };

  var textEl = toast.querySelector('.contact-toast__text');

  function show(variant) {
    window.clearTimeout(hideTimer);
    window.clearTimeout(removeVisibleTimer);

    toast.classList.remove('contact-toast--copy', 'contact-toast--send');
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
    show(type === 'copy' ? COPY : SEND);
  };
})();
