import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../maps/index.html", import.meta.url), "utf8");

assert.match(html, /<html lang="ar" dir="rtl">/);
assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
assert.match(html, /<link rel="canonical" href="https:\/\/mohtaway\.github\.io\/mohtaway-landing\/maps\/">/);
assert.match(html, /p2059934520/);
assert.match(html, /whatsapp_click/);
assert.match(html, /package_click/);
assert.match(html, /scroll_depth/);
assert.match(html, /محتواي مزود خدمة مستقل/);
assert.match(html, /لا نتبع Google/);
assert.match(html, /لا يصح ضمانها/);
assert.match(html, /يشمل ضريبة القيمة المضافة عند استحقاقها/);
assert.doesNotMatch(html, /نضمن|مضمون.{0,20}(قبول|ترتيب)|المركز الأول مضمون/);

console.log("maps landing smoke checks passed");
