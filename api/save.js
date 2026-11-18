// Admin panel uchun server funksiyasi (Vercel).
// Parolni tekshiradi va data/sayt.json faylini GitHub'dagi main branchga yozadi.
// Vercel'da quyidagi Environment Variables bo'lishi shart:
//   ADMIN_PASSWORD — admin panel paroli
//   GITHUB_TOKEN   — faqat shu repo uchun "Contents: Read and write" huquqli GitHub token
// Ixtiyoriy: GITHUB_REPO (standart: muhammadboburbahromjonov-stack/-buloglibog.uz), GITHUB_BRANCH (standart: main)

const crypto = require('crypto');

const REPO = process.env.GITHUB_REPO || 'muhammadboburbahromjonov-stack/-buloglibog.uz';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const FILE = 'data/sayt.json';

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function str(v, max) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s && s.length <= max ? s : null;
}

function price(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1000 && n <= 100000000 ? n : null;
}

function validate(d) {
  if (!d || typeof d !== 'object') return { error: "Ma'lumot topilmadi" };
  const out = {
    telefon: str(d.telefon, 40),
    narx_oddiy: price(d.narx_oddiy),
    narx_pol_lyuks: price(d.narx_pol_lyuks),
    narx_lyuks: price(d.narx_lyuks),
    shior_uz: str(d.shior_uz, 200),
    shior_ru: str(d.shior_ru, 200),
    ariza_havola: str(d.ariza_havola, 500),
  };
  if (!out.telefon || !/^\+?[\d\s()-]{7,}$/.test(out.telefon)) return { error: "Telefon raqami noto'g'ri" };
  if (!out.narx_oddiy || !out.narx_pol_lyuks || !out.narx_lyuks) return { error: "Narxlar butun son bo'lishi kerak (masalan, 340000)" };
  if (!out.shior_uz || !out.shior_ru) return { error: "Shior bo'sh bo'lmasligi kerak" };
  if (!out.ariza_havola || !/^https:\/\/\S+$/.test(out.ariza_havola)) return { error: "Ariza havolasi https:// bilan boshlanishi kerak" };
  return { data: out };
}

async function gh(path, opts = {}) {
  const r = await fetch('https://api.github.com/repos/' + REPO + path, {
    ...opts,
    headers: {
      Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'buloglibog-admin',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.headers || {}),
    },
  });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Faqat POST' });
  }
  if (!process.env.ADMIN_PASSWORD || !process.env.GITHUB_TOKEN) {
    return res.status(500).json({ error: "Server sozlanmagan: Vercel'da ADMIN_PASSWORD va GITHUB_TOKEN qo'shilmagan" });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: "So'rov noto'g'ri" });

  if (!safeEqual(body.password || '', process.env.ADMIN_PASSWORD)) {
    await new Promise((r) => setTimeout(r, 1200)); // parolni taxmin qilishni sekinlashtirish
    return res.status(401).json({ error: "Parol noto'g'ri" });
  }
  if (body.check) return res.status(200).json({ ok: true });

  const v = validate(body.data);
  if (v.error) return res.status(400).json({ error: v.error });

  const cur = await gh('/contents/' + FILE + '?ref=' + encodeURIComponent(BRANCH));
  if (!cur.ok) return res.status(502).json({ error: 'GitHub bilan bog\'lanib bo\'lmadi (' + cur.status + '). Token huquqlarini tekshiring.' });

  const content = Buffer.from(JSON.stringify(v.data, null, 2) + '\n', 'utf8').toString('base64');
  const put = await gh('/contents/' + FILE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: "Admin panel: sayt ma'lumotlari yangilandi",
      content,
      sha: cur.body.sha,
      branch: BRANCH,
    }),
  });
  if (!put.ok) return res.status(502).json({ error: 'Saqlab bo\'lmadi (' + put.status + '). Qaytadan urinib ko\'ring.' });

  return res.status(200).json({ ok: true, data: v.data });
};
