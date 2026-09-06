(function () {
  'use strict';
  if (window.__mwStoreQuote) return;
  window.__mwStoreQuote = true;
  const dialog = document.createElement('dialog');
  dialog.id = 'store-quote';
  dialog.dir = 'rtl';
  dialog.setAttribute('aria-labelledby', 'store-quote-title');
  dialog.innerHTML = `
    <button type="button" class="quote-close" aria-label="إغلاق طلب العرض">×</button>
    <h2 id="store-quote-title">خلّنا نعرف مشروعك</h2>
    <p>تفاصيل بسيطة تساعدنا نرشح لك الباقة ونجهز عرضًا مناسبًا.</p>
    <form id="store-quote-form">
      <label>اسمك<input name="name" autocomplete="given-name" maxlength="60" required></label>
      <label>وش نشاط متجرك؟<input name="activity" placeholder="مثل: عطور، ملابس، هدايا" maxlength="120" required></label>
      <label>وش تحتاج؟<select name="need" required><option value="">اختر حالة متجرك</option><option>إنشاء متجر جديد</option><option>تطوير متجر قائم</option><option>أحتاج تحديد الخدمة المناسبة</option></select></label>
      <label>ميزانيتك التقريبية للتنفيذ<select name="budget" required><option value="">اختر النطاق المناسب</option><option>أقل من ١٬٠٠٠ ريال</option><option>١٬٠٠٠–١٬٩٩٩ ريال</option><option>٢٬٠٠٠–٣٬٤٩٩ ريال</option><option>٣٬٥٠٠ ريال فأكثر</option><option>أحتاج عرضًا لتحديد الميزانية</option></select></label>
      <label>متى تبي تبدأ؟<select name="timing" required><option value="">اختر وقتًا تقريبيًا</option><option>خلال أسبوعين</option><option>خلال شهر</option><option>أستكشف الخيارات حاليًا</option></select></label>
      <label class="quote-consent"><input type="checkbox" name="measurement">أوافق اختياريًا على مشاركة بيانات مصدر زيارتي مع Google لقياس نتيجة الإعلان. رفضي لا يؤثر على الخدمة.</label>
      <p class="quote-note">سنجهز التفاصيل في رسالة واتساب؛ يصلنا الطلب بعد أن ترسلها بنفسك. نستخدم بياناتك للرد على طلبك، ورقم التواصل يظهر لنا عند إرسال الرسالة.</p>
      <button type="submit" class="quote-submit">تابع طلب العرض على واتساب ←</button>
      <p id="quote-status" role="status" aria-live="polite"></p>
    </form>`;
  document.body.appendChild(dialog);
  const form = dialog.querySelector('form');
  const status = dialog.querySelector('#quote-status');
  let trigger;
  let requestId;
  const clean = value => String(value || '').replace(/[\r\n\[\]<>]/g, ' ').trim();
  function attribution() {
    let saved = {};
    try { saved = JSON.parse(sessionStorage.getItem('mwutm') || '{}'); } catch (_) {}
    const params = new URLSearchParams(location.search);
    const touchKeys = ['utm_source', 'utm_campaign', 'gclid', 'gbraid', 'wbraid', 'fbclid', 'ttclid', 'sclid'];
    if (touchKeys.some(key => params.get(key))) saved = Object.fromEntries(params.entries());
    return saved && typeof saved === 'object' ? saved : {};
  }
  function newId() {
    return 'MW-' + crypto.randomUUID();
  }
  function close() { dialog.close(); if (trigger) trigger.focus(); }
  dialog.querySelector('.quote-close').addEventListener('click', close);
  dialog.addEventListener('cancel', () => { if (trigger) trigger.focus(); });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href="#store-quote"]');
    if (!link) return;
    event.preventDefault();
    trigger = link;
    if (!requestId) requestId = newId();
    if (!dialog.open) dialog.showModal();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const fields = ['name', 'activity', 'need', 'budget', 'timing'];
    if (fields.some(key => !clean(values.get(key)))) { status.textContent = 'أكمل تفاصيل الطلب أولًا.'; return; }
    const ref = requestId || (requestId = newId());
    const source = attribution();
    const consent = values.get('measurement') === 'on';
    const lines = ['مرحبًا محتواي، أطلب عرضًا لخدمة المتاجر.',
      'الاسم: ' + clean(values.get('name')), 'النشاط: ' + clean(values.get('activity')),
      'الخدمة المطلوبة: ' + clean(values.get('need')), 'الميزانية: ' + clean(values.get('budget')),
      'موعد البدء: ' + clean(values.get('timing')), 'مرجع الطلب: ' + ref];
    // Metadata is transported only in the customer-sent message, never to analytics.
    const safeToken = value => /^[A-Za-z0-9_.:-]{1,300}$/.test(String(value || '')) ? String(value) : '';
    const campaign = safeToken(source.utm_campaign);
    const channel = safeToken(source.utm_source) || 'direct';
    lines.push('[ref:' + channel + (campaign ? ':' + campaign : '') + ']');
    lines.push('[measurement_consent:' + (consent ? 'granted' : 'denied') + ']');
    if (consent) {
      ['gclid', 'gbraid', 'wbraid'].forEach(key => {
        const value = safeToken(source[key]);
        if (value) lines.push('[' + key + ':' + value + ']');
      });
    }
    const url = new URL('https://wa.me/966533672708');
    url.searchParams.set('text', lines.join('\n'));
    // No submit-lead/qualified-lead conversion: opening WhatsApp does not prove a sent message.
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'quote_whatsapp_open', {event_category: 'engagement'});
      window.gtag('event', 'conversion', {send_to: 'AW-10937612701/dKdWCLDtt-gcEJ3zut8o'});
    }
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
    status.textContent = 'أرسل الرسالة من واتساب ليصلنا طلبك. إذا لم يفتح، اضغط الزر مرة أخرى.';
  });
})();
