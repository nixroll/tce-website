/* 21.08. Три доработки мобильного меню по прямой просьбе пользователя
 * (см. скриншоты в чате):
 *
 * 1) Открытая .header__mobile-panel по высоте меньше экрана (так и в
 *    Figma, node 384:2287) — часть страницы под ней раньше оставалась
 *    видна и по-прежнему кликабельна/скроллируема, хотя меню формально
 *    открыто. Теперь: блокируем скролл фона (lockScroll/unlockScroll)
 *    и добавляем клик-перехватчик (.header-overlay, см.
 *    header-home.njk/style.css) — тап по оставшейся видимой части
 *    страницы закрывает меню, а не уводит на ссылку/скроллит.
 *
 *    21.08, багфикс версии №2 (пользователь, скриншот: тема Header на
 *    Home "залипла" полупрозрачной/блёклой): первая версия lockScroll
 *    блокировала фон классическим для iOS Safari приёмом
 *    position:fixed на body + сохранение/восстановление window.scrollY
 *    через inline top. Проблема: на этом сайте scrollY уже использует
 *    ДРУГОЙ скрипт — header-home-theme.7.js (плавное переключение темы
 *    Header по скроллу на Home + "menkind"-эффект сноса шапки вверх в
 *    зоне Hero). position:fixed на body сбрасывает window.scrollY в 0
 *    (сам body перестаёт быть скроллируемым) — это ловится тем же
 *    'scroll'-слушателем и на один кадр сбивает расчёт темы ровно в
 *    момент открытия меню, тема "залипает" неверной. Переехали на
 *    overflow:hidden + overscroll-behavior:none (см. style.css) — эта
 *    пара НЕ трогает scrollY вообще, скроллить просто некуда, но само
 *    значение не меняется, header-home-theme.js ничего не замечает.
 *    Заодно упростилось: без изменения scrollY не нужно его сохранять/
 *    восстанавливать при закрытии — тот отдельный баг ("при закрытии
 *    страница странно проскролливается", решался через
 *    scrollTo(...,{behavior:'instant'})) снят той же правкой, самим
 *    отсутствием причины.
 * 2) Escape тоже закрывает — стандартное поведение для всплывающих
 *    панелей, мелочь, но ожидаемая (говорим об этом пользователю
 *    отдельно, как о "так делают топовые студии": полная блокировка
 *    фона + закрытие по клику вне/Escape, БЕЗ закрытия по попытке
 *    скролла — эта попытка теперь просто ничего не делает благодаря
 *    lockScroll, отдельно её перехватывать как триггер закрытия не
 *    стали: слишком легко закрыть меню случайно, чуть дрогнувшим
 *    пальцем).
 * 3) Общий openMenu/closeMenu вместо прямого toggle классов — резайз
 *    до десктопной раскладки (mq-обработчик ниже) теперь тоже всегда
 *    идёт через closeMenu(), иначе после добавления scroll-lock он бы
 *    закрывал панель, но забывал разлочить фон.
 *
 * header-overlay в разметке есть только у header-home.njk (живой
 * Header, используется на всех страницах) — у архивного header.njk
 * (только /old-home/, сознательно не трогаем) его нет, поэтому overlay
 * ищем через querySelector и проверяем на null перед использованием:
 * там будет работать всё, кроме клика по фону — это ожидаемо,
 * страница архивная. */
document.addEventListener('DOMContentLoaded', function () {
  var header = document.querySelector('.site-header');
  var burger = document.querySelector('.header__burger');
  if (!header || !burger) return;

  var overlay = document.querySelector('.header-overlay');

  function lockScroll() {
    document.documentElement.classList.add('is-menu-locked');
    document.body.classList.add('is-menu-locked');
  }

  function unlockScroll() {
    document.documentElement.classList.remove('is-menu-locked');
    document.body.classList.remove('is-menu-locked');
  }

  function openMenu() {
    header.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    lockScroll();
  }

  function closeMenu() {
    header.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    unlockScroll();
  }

  burger.addEventListener('click', function () {
    if (header.classList.contains('is-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  if (overlay) {
    overlay.addEventListener('click', closeMenu);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('is-open')) {
      closeMenu();
    }
  });

  // Закрываем мобильное меню, если окно расширили до планшетной/десктопной раскладки
  var mq = window.matchMedia('(min-width: 768px)');
  mq.addEventListener('change', function (e) {
    if (e.matches && header.classList.contains('is-open')) {
      closeMenu();
    }
  });
});
