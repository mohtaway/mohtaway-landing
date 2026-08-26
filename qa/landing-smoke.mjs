import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

assert.match(html, /<html lang="ar" dir="rtl">/);
assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
assert.match(html, /<meta name="description" content="[^"]+">/);
assert.match(html, /<link rel="canonical" href="https:\/\/mohtaway\.github\.io\/mohtaway-landing\/">/);
assert.match(html, /G-CHVCDKS3NR/);
assert.match(html, /AW-1100174431/);
assert.match(html, /whatsapp_click/);
assert.match(html, /package_click/);
assert.match(html, /scroll_depth/);
assert.match(html, /a\.dataset\.mwRef='1'/);
assert.match(html, /new MutationObserver/);
assert.match(html, /childList:true,subtree:true/);
assert.doesNotMatch(html, /if\(q\)\{ try\{ var u=new URL\(href\); var t=u\.searchParams\.get\('text'\)\|\|''; u\.searchParams\.set\('text', t\+'\\n\[ref:'/);

console.log("landing smoke checks passed");
