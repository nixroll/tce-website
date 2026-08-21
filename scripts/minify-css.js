#!/usr/bin/env node
/* 21.08, SEO/производительность-аудит: PageSpeed Insights на мобилке дал
 * 66/100 (десктоп — 98/100), главная причина — блокирующий отрисовку
 * style.19.css грузится ПОЛНОСТЬЮ НЕСЖАТЫМ: 364 КБ, из них ~60% —
 * комментарии (в проекте принято подробно комментировать каждый блок
 * стилей, история решений и т.д. — удобно при разработке, бесполезно в
 * браузере). Просто без пробелов и комментариев файл падает до ~110 КБ.
 *
 * Пакетный минификатор (clean-css/cssnano) поставить нельзя — сборка
 * идёт в песочнице без доступа к npm registry (см. попытку `npm install
 * clean-css` — 403). Поэтому минификация написана руками, без зависимостей,
 * запускается как npm postbuild-хук (см. package.json) ПОСЛЕ `eleventy`,
 * то есть уже над готовым _site — источник src/css/style.19.css трогать
 * не нужно и не нужно менять привычку класть туда подробные комментарии,
 * они просто не попадут в то, что реально уезжает в браузер.
 *
 * Что делает, специально КОНСЕРВАТИВНО (минимум риска сломать CSS):
 *   1) Вырезает /* ... *\/  комментарии — семантически всегда безопасно,
 *      это даёт основную экономию (~60%).
 *   2) Схлопывает ЛЮБОЙ пробельный ран (пробелы/табы/переводы строк) в
 *      ОДИН пробел — не убирает пробелы полностью, просто убирает лишние.
 *      Единственный пробел, который что-то значит (например, разделитель
 *      в "Inter Display" или между классами в селекторе), остаётся на
 *      месте — меняется только КОЛИЧЕСТВО пробелов, не их наличие.
 *   3) НЕ трогает пробелы вокруг { } : ; , и НЕ убирает финальные `;`
 *      перед `}` — та агрессивная минификация (характерная для
 *      clean-css/cssnano), которая теоретически может задеть edge-case
 *      с calc()/custom properties. Тут этого риска нет вообще, ценой
 *      чуть меньшей экономии сверху.
 *   4) Обе стадии — строково-осведомлённые: содержимое в "..."/'...'
 *      (пути шрифтов, font-family, url()) копируется побайтово, туда
 *      логика вырезания комментариев/схлопывания пробелов не заходит —
 *      иначе можно было бы случайно испортить путь или строку с
 *      пробелом.
 *
 * Обрабатывает ВСЕ *.css в _site/css/ (а не жёстко "style.19.css") —
 * при следующем переименовании файла (та самая история с зависающим
 * кешем GitHub Pages/Fastly, см. комментарий у <link rel="stylesheet">
 * в base.njk) править этот скрипт не придётся. */
'use strict';

const fs = require('fs');
const path = require('path');

const CSS_DIR = path.join(__dirname, '..', '_site', 'css');

function stripCommentsAndCollapseWhitespace(input) {
  let out = '';
  let i = 0;
  const n = input.length;
  let inString = null; // '"' | "'" | null
  let inComment = false;
  let lastWasSpace = false;

  while (i < n) {
    const c = input[i];
    const c2 = i + 1 < n ? input[i + 1] : '';

    if (inComment) {
      if (c === '*' && c2 === '/') {
        inComment = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (inString) {
      out += c;
      if (c === '\\' && i + 1 < n) {
        // экранированный символ — копируем и его, не интерпретируя
        out += input[i + 1];
        i += 2;
        continue;
      }
      if (c === inString) {
        inString = null;
      }
      i += 1;
      lastWasSpace = false;
      continue;
    }

    // вне строки и вне комментария
    if (c === '/' && c2 === '*') {
      inComment = true;
      i += 2;
      continue;
    }

    if (c === '"' || c === "'") {
      inString = c;
      out += c;
      i += 1;
      lastWasSpace = false;
      continue;
    }

    if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f') {
      if (!lastWasSpace) {
        out += ' ';
        lastWasSpace = true;
      }
      i += 1;
      continue;
    }

    out += c;
    lastWasSpace = false;
    i += 1;
  }

  return out.trim();
}

if (!fs.existsSync(CSS_DIR)) {
  console.log('[minify-css] _site/css отсутствует (сборка ещё не запускалась?) — пропуск');
  process.exit(0);
}

const files = fs.readdirSync(CSS_DIR).filter((f) => f.endsWith('.css'));

if (files.length === 0) {
  console.log('[minify-css] .css файлов в _site/css не найдено — пропуск');
}

for (const file of files) {
  const filePath = path.join(CSS_DIR, file);
  const original = fs.readFileSync(filePath, 'utf8');
  const minified = stripCommentsAndCollapseWhitespace(original);

  const originalBytes = Buffer.byteLength(original, 'utf8');
  const minifiedBytes = Buffer.byteLength(minified, 'utf8');
  const savedPct = Math.round((1 - minifiedBytes / originalBytes) * 100);

  fs.writeFileSync(filePath, minified, 'utf8');
  console.log(`[minify-css] ${file}: ${originalBytes} -> ${minifiedBytes} байт (-${savedPct}%)`);
}
