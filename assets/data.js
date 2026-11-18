/* Admin panel (Pages CMS) orqali o'zgartiriladigan ma'lumotlar: data/sayt.json
   HTML ichida doim quyidagi BOSHLANG'ICH qiymatlar yozilgan bo'ladi. Sahifa ochilganda
   data/sayt.json o'qiladi va eski qiymatlar yangilariga almashtiriladi.
   Diqqat: HTML'dagi matnni qo'lda o'zgartirsangiz, D obyektini ham shunga moslang. */
(function () {
  var D = {
    telefon: "+998 77 324 00 03",
    narx_oddiy: 340000, narx_pol_lyuks: 370000, narx_lyuks: 470000,
    shior_uz: "Siz biz uchun mijoz emas — bemorsiz",
    shior_ru: "Для нас вы не клиент, а пациент",
    ariza_havola: "https://forms.gle/gRoHzKbZsQmoLKWW8"
  };
  var KUNLAR = [7, 10, 14];

  function fmt(n) { return String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function apply(N) {
    var map = {};
    function add(a, b) { if (b === undefined || b === null || b === '') return; a = String(a); b = String(b); if (a !== b) map[a] = b; }
    var okNarx = function (v) { return typeof v === 'number' && v > 0; };
    if (okNarx(N.narx_oddiy)) KUNLAR.forEach(function (d) { add(fmt(D.narx_oddiy * d), fmt(N.narx_oddiy * d)); });
    if (okNarx(N.narx_oddiy)) add(fmt(D.narx_oddiy), fmt(N.narx_oddiy));
    if (okNarx(N.narx_pol_lyuks)) add(fmt(D.narx_pol_lyuks), fmt(N.narx_pol_lyuks));
    if (okNarx(N.narx_lyuks)) add(fmt(D.narx_lyuks), fmt(N.narx_lyuks));
    add(D.telefon, N.telefon);
    add(D.shior_uz, N.shior_uz);
    add(D.shior_ru, N.shior_ru);

    var keys = Object.keys(map).sort(function (a, b) { return b.length - a.length; });
    if (keys.length) {
      var re = new RegExp(keys.map(esc).join('|'), 'g');
      var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) { var p = n.parentNode && n.parentNode.nodeName; return (p === 'SCRIPT' || p === 'STYLE') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
      });
      var nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
      nodes.forEach(function (t) { if (re.test(t.nodeValue)) { re.lastIndex = 0; t.nodeValue = t.nodeValue.replace(re, function (m) { return map[m]; }); } re.lastIndex = 0; });
    }
    if (N.telefon) {
      var tel = 'tel:' + String(N.telefon).replace(/[^\d+]/g, '');
      document.querySelectorAll('a[href^="tel:"]').forEach(function (a) { a.setAttribute('href', tel); });
    }
    if (N.ariza_havola && /^https?:\/\//.test(N.ariza_havola)) {
      document.querySelectorAll('a[href="' + D.ariza_havola + '"]').forEach(function (a) { a.setAttribute('href', N.ariza_havola); });
    }
  }

  try {
    fetch('data/sayt.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (N) { if (N) apply(N); })
      .catch(function () {});
  } catch (e) {}
})();
