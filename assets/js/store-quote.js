(function () {
  'use strict';
  const service = document.currentScript && document.currentScript.dataset.service === 'maps' ? 'maps' : 'stores';
  const guard = '__mwServiceQuote_' + service;
  if (window[guard]) return;
  window[guard] = true;
  const isMaps = service === 'maps';
  const id = isMaps ? 'maps-quote' : 'store-quote';
  const endpoint = 'https://app.mohtaway.com/api/public/service-leads';
  // Service-specific WEBPAGE/SUBMIT_LEAD_FORM actions; never a paid or qualified lead.
  const conversionTargets = {"stores": "AW-10937612701/Lbb6COnen_IcEJ3zut8o", "maps": "AW-10937612701/6YE7COzen_IcEJ3zut8o"};
  const storageKey = 'mw-service-request-v1:' + service;
  const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
  let persisted = {};
  try { persisted = JSON.parse(sessionStorage.getItem(storageKey) || '{}'); } catch (_) {}
  let requestId = uuid(persisted.requestId) ? persisted.requestId : crypto.randomUUID();
  let receipt = persisted.saved === true && persisted.requestId === requestId ? persisted : null;
  let challenge = '';
  let challengeAt = 0;
  let challengePromise;
  let pending = false;
  let trigger;
  const persist = value => { try { sessionStorage.setItem(storageKey, JSON.stringify(value)); } catch (_) {} };
  persist(receipt || { requestId });
  const clean = value => String(value || '').replace(/[\r\n\[\]<>]/g, ' ').trim();
  const phoneDigits = value => String(value || '').replace(/[٠-٩]/g, n => String('٠١٢٣٤٥٦٧٨٩'.indexOf(n))).replace(/[۰-۹]/g, n => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(n))).replace(/[\s()-]/g, '');
  const validPhone = value => /^(?:05\d{8}|\+9665\d{8}|009665\d{8}|9665\d{8})$/.test(phoneDigits(value));
  const dialog = document.createElement('dialog');
  dialog.id = id;
  dialog.className = 'service-quote';
  dialog.dir = 'rtl';
  dialog.setAttribute('aria-labelledby', id + '-title');
  dialog.innerHTML = `
    <button type="button" class="quote-close" aria-label="إغلاق طلب العرض">×</button>
    <h2 id="${id}-title">${isMaps ? 'نراجع حالة نشاطك<br><span>قبل طلب الخدمة</span>' : 'خلّنا نعرف مشروعك<br><span>ونجهز لك عرض مناسب</span>'}</h2>
    <p>${isMaps ? 'أرسل بيانات نشاطك لنحدد المسار المناسب. سعر التجهيز والمتابعة ٦٩٠ ريال شامل الضريبة.' : 'تفاصيل بسيطة تساعدنا نرشح لك الباقة ونتواصل معك.'}</p>
    <form id="${id}-form">
      <div class="quote-fields">
        <label>اسمك<input name="name" autocomplete="given-name" minlength="2" maxlength="100" required></label>
        <label>رقم جوالك للتواصل<input name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" placeholder="05xxxxxxxx" maxlength="24" required aria-describedby="${id}-phone-help"></label>
        <small id="${id}-phone-help">رقم جوال سعودي يمكن التواصل معك عليه.</small>
        <label>${isMaps ? 'نوع النشاط' : 'وش نشاط متجرك؟'}<input name="activity" placeholder="${isMaps ? 'مثل: عيادة، مطعم، محل' : 'مثل: عطور، ملابس، هدايا'}" minlength="2" maxlength="200" required></label>
        ${isMaps ? `
          <label>المدينة<input name="city" autocomplete="address-level2" minlength="2" maxlength="100" required></label>
          <label>حالة ملف النشاط<select name="mapStatus" required><option value="">اختر الحالة</option><option value="missing">ما عندي ملف نشاط</option><option value="unverified">موجود ولم يكتمل إثبات الملكية</option><option value="suspended">معلّق أو سبق رفضه</option><option value="unsure">غير متأكد</option></select></label>
          <p class="quote-context">إذا كان الملف معلّقًا، نراجع حالته قبل تحديد الخدمة المناسبة. القبول وطريقة التحقق تحددهما قوقل.</p>
        ` : `
          <label>وش تحتاج؟<select name="need" required><option value="">اختر حالة متجرك</option><option value="new_store">إنشاء متجر جديد — من ١٬٤٩٩ ريال</option><option value="improve_store">تطوير متجر قائم — من ٩٩٠ ريال</option><option value="unsure">أحتاج تحديد الخدمة المناسبة</option></select></label>
          <label>ميزانيتك التقريبية للتنفيذ<select name="budget" required><option value="">اختر النطاق المناسب</option><option>أقل من ١٬٠٠٠ ريال</option><option>١٬٠٠٠–١٬٩٩٩ ريال</option><option>٢٬٠٠٠–٣٬٤٩٩ ريال</option><option>٣٬٥٠٠ ريال فأكثر</option><option>أحتاج عرضًا لتحديد الميزانية</option></select></label>
          <label>متى تبي تبدأ؟ <span class="quote-optional">(اختياري)</span><select name="timing"><option value="">اختر وقتًا تقريبيًا</option><option>خلال أسبوعين</option><option>خلال شهر</option><option>أستكشف الخيارات حاليًا</option></select></label>
        `}
        <div class="quote-trap" aria-hidden="true"><label>موقع الشركة<input name="website" autocomplete="off" tabindex="-1" maxlength="200"></label></div>
        <p class="quote-note">نحفظ بياناتك في مركز محتواي للرد على طلبك ومتابعته. نستخدم مصدر الزيارة لقياس أداء الحملة، ولا نرسل اسمك أو رقم جوالك لأدوات التحليل. <a href="https://mohtaway.com/سياسة-الخصوصية/page-1636777905" target="_blank" rel="noopener noreferrer">سياسة الخصوصية</a>.</p>
        <button type="submit" class="quote-submit">${isMaps ? 'أرسل طلب مراجعة الأهلية' : 'أرسل طلب العرض'} ←</button>
      </div>
      <p class="quote-status" role="status" aria-live="polite"></p>
      <a class="quote-help" hidden target="_blank" rel="noopener noreferrer">تواصل معنا بخصوص هذا الطلب</a>
      <div class="quote-success" hidden>
        <p class="quote-reference"></p>
        <p>وصَلنا طلبك. نراجع التفاصيل ونتواصل معك على الرقم المسجّل.</p>
        <a class="quote-whatsapp" target="_blank" rel="noopener noreferrer">تابع معنا على واتساب</a>
        <button type="button" class="quote-new">إرسال طلب جديد</button>
      </div>
    </form>`;
  document.body.appendChild(dialog);
  const form = dialog.querySelector('form');
  const fields = dialog.querySelector('.quote-fields');
  const status = dialog.querySelector('.quote-status');
  const submit = dialog.querySelector('.quote-submit');
  const success = dialog.querySelector('.quote-success');
  const help = dialog.querySelector('.quote-help');
  const whatsapp = dialog.querySelector('.quote-whatsapp');
  const phone = form.elements.phone;
  const defaultSubmit = submit.textContent;
  phone.addEventListener('input', () => phone.setCustomValidity(''));

  function attribution() {
    let saved = {};
    try { saved = JSON.parse(sessionStorage.getItem('mwutm') || '{}'); } catch (_) {}
    const params = new URLSearchParams(location.search);
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    if (keys.some(key => params.get(key))) saved = Object.fromEntries(params.entries());
    const out = {};
    keys.forEach(key => { if (typeof saved[key] === 'string' && saved[key].length <= 150) out[key] = clean(saved[key]); });
    out.landing_path = location.pathname.slice(0, 300);
    // No contact identifiers or inferred advertising consent leave this intake path.
    return out;
  }
  async function request(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { ...options, credentials: 'omit', signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { const error = new Error('request_failed'); error.status = response.status; error.code = data.code; throw error; }
      return data;
    } finally { clearTimeout(timer); }
  }
  function getChallenge(force) {
    if (!force && challenge && Date.now() - challengeAt < 8 * 60 * 1000) return Promise.resolve(challenge);
    if (challengePromise) return challengePromise;
    challengePromise = request(endpoint + '?service=' + service + '&requestId=' + encodeURIComponent(requestId), { method: 'GET' }).then(data => {
      if (typeof data.challenge !== 'string' || !data.challenge) throw new Error('challenge_invalid');
      challenge = data.challenge; challengeAt = Date.now(); return challenge;
    }).finally(() => { challengePromise = null; });
    return challengePromise;
  }
  function showReceipt() {
    help.hidden = true;
    fields.hidden = true;
    success.hidden = false;
    status.textContent = 'تم حفظ طلبك بنجاح.';
    status.dataset.state = 'success';
    dialog.querySelector('.quote-reference').textContent = 'مرجع طلبك: MW-' + requestId;
    const lines = [isMaps ? 'مرحبًا محتواي، أتابع طلب مراجعة أهلية نشاطي.' : 'مرحبًا محتواي، أتابع طلب عرض المتجر.', 'مرجع الطلب: MW-' + requestId];
    const url = new URL('https://wa.me/966533672708');
    url.searchParams.set('text', lines.join('\n'));
    whatsapp.href = url.toString();
  }
  function recordSaved(data) {
    if (data.isTest || !data.conversionEligible || receipt && receipt.eventRecorded) return;
    // Only opaque deduplication reference and service: no customer fields or raw click identifiers.
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'service_lead_saved', { service, transaction_id: requestId });
      if (conversionTargets[service]) window.gtag('event', 'conversion', { send_to: conversionTargets[service], transaction_id: requestId });
    }
    receipt.eventRecorded = true;
    persist(receipt);
  }
  function setPending(value) {
    pending = value;
    submit.disabled = value;
    form.setAttribute('aria-busy', String(value));
    [...form.querySelectorAll('input,select')].forEach(input => { input.disabled = value; });
    submit.textContent = value ? 'جاري حفظ طلبك…' : defaultSubmit;
  }
  function close() { dialog.close(); if (trigger) trigger.focus(); }
  dialog.querySelector('.quote-close').addEventListener('click', close);
  dialog.addEventListener('cancel', () => { if (trigger) trigger.focus(); });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href="#' + id + '"]');
    if (!link) return;
    event.preventDefault(); trigger = link;
    if (!dialog.open) dialog.showModal();
    if (receipt) showReceipt();
    else {
      if (!isMaps && !form.elements.need.value) {
        const intent = link.dataset.need || new URLSearchParams(location.search).get('service_intent');
        if (['new_store', 'improve_store'].includes(intent)) form.elements.need.value = intent;
      }
      getChallenge(false).catch(() => {});
    }
  });
  dialog.querySelector('.quote-new').addEventListener('click', () => {
    if (pending) return;
    requestId = crypto.randomUUID(); receipt = null; challenge = ''; challengeAt = 0;
    persist({ requestId }); form.reset(); help.hidden = true; fields.hidden = false; success.hidden = true; status.textContent = ''; delete status.dataset.state;
    form.elements.name.focus(); getChallenge(true).catch(() => {});
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || receipt) return;
    phone.setCustomValidity(validPhone(phone.value) ? '' : 'أدخل رقم جوال سعودي صحيحًا، مثل 05xxxxxxxx.');
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const payload = {
      requestId, service, name: clean(values.get('name')), phone: phoneDigits(values.get('phone')),
      activity: clean(values.get('activity')), need: isMaps ? 'business_profile_setup' : values.get('need'),
      attribution: attribution(), website: String(values.get('website') || '')
    };
    if (isMaps) { payload.city = clean(values.get('city')); payload.mapStatus = values.get('mapStatus'); }
    else { payload.budget = clean(values.get('budget')); if (values.get('timing')) payload.timing = clean(values.get('timing')); }
    setPending(true); help.hidden = true; status.textContent = 'جاري حفظ طلبك…'; delete status.dataset.state;
    try {
      payload.challenge = await getChallenge(false);
      // Signed challenge has a minimum age; this is only an interface delay, not the security gate.
      const remaining = 2100 - (Date.now() - challengeAt);
      if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
      const data = await request(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (data.ok !== true || data.requestId !== requestId || data.service !== service || typeof data.isTest !== 'boolean' || typeof data.conversionEligible !== 'boolean') throw new Error('receipt_invalid');
      receipt = { requestId, saved: true, isTest: data.isTest, eventRecorded: false };
      persist(receipt); recordSaved(data); showReceipt();
    } catch (error) {
      status.dataset.state = 'error';
      if (error.status === 429) status.textContent = 'وصلت محاولات كثيرة خلال وقت قصير. انتظر قليلًا ثم أعد المحاولة.';
      else if (error.status === 409) status.textContent = 'يوجد طلب محفوظ بهذا المرجع بتفاصيل مختلفة. تواصل معنا على واتساب واذكر المرجع: MW-' + requestId;
      else if (error.code === 'challenge_expired' || error.code === 'invalid_challenge' || error.status === 425) status.textContent = 'انتهت مهلة الإرسال. اضغط إرسال مرة ثانية؛ تفاصيلك محفوظة هنا.';
      else if (error.status === 400 || error.status === 422) status.textContent = 'تعذّر قبول بعض التفاصيل. راجع رقم الجوال والحقول ثم أعد المحاولة.';
      else status.textContent = 'لم نتأكد من حفظ الطلب. أعد المحاولة؛ سنستخدم المرجع نفسه لمنع التكرار.';
      if (error.status === 409 || !error.status || error.status >= 500) {
        const contact = new URL('https://wa.me/966533672708');
        contact.searchParams.set('text', 'مرحبًا محتواي، أحتاج مساعدة للتحقق من استلام طلبي. مرجع المحاولة: MW-' + requestId);
        help.href = contact.toString(); help.hidden = false;
      }
      challenge = ''; challengeAt = 0;
    } finally { setPending(false); }
  });
})();
