'use strict';
var $ = function (id) { return document.getElementById(id); };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
var S = { token: '', name: '', role: '', patients: [], visits: [], last: {}, tab: 'dash', q: '', f: 'all' };
var LV = { green: ['ปกติ', 'var(--g)'], yellow: ['เฝ้าระวัง', 'var(--y)'], red: ['เค็มจัด', 'var(--r)'], none: ['ยังไม่ตรวจ', 'var(--mu)'] };
var DIS = ['เบาหวาน', 'ความดันโลหิตสูง', 'โรคไต', 'โรคหัวใจ', 'ไขมันในเลือดสูง', 'หลอดเลือดสมอง', 'อื่นๆ'];
var QS = ['เติมน้ำปลา/ซีอิ๊ว/ซอสเพิ่มขณะกินข้าว', 'กินอาหารหมักดอง ปลาร้า กะปิ เป็นประจำ', 'ซดน้ำแกง/น้ำก๋วยเตี๋ยวจนหมด',
  'กินอาหารแปรรูป ไส้กรอก ปลากระป๋อง บะหมี่สำเร็จรูป', 'ปรุงอาหารรสจัด ใส่เครื่องปรุงมาก', 'กินขนมขบเคี้ยวรสเค็มเป็นประจำ', 'ไม่เคยอ่านฉลากโซเดียม'];
var lvOf = function (v) { v = parseFloat(v); return v <= 0.7 ? 'green' : (v <= 1 ? 'yellow' : 'red'); };
var store = {
  get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
};
function today() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }
function fmtD(d) { return d ? new Date(d + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'; }
function badge(k) { return '<span class="bg" style="background:' + LV[k][1] + '">' + LV[k][0] + '</span>'; }
function photosOf(v) { return String((v && v.photo) || '').split('|').filter(Boolean); }
function visitsOf(pid) { return S.visits.filter(function (v) { return v.patientId === pid; }).sort(function (a, b) { return b.date.localeCompare(a.date); }); }
function find(id) { return S.patients.filter(function (p) { return p.id === id; })[0]; }
var tt;
function toast(m, bad) {
  var t = $('toast'); t.textContent = m; t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(tt); tt = setTimeout(function () { t.className = ''; }, 3200);
}
function theme() {
  var d = document.documentElement, n = d.dataset.t === 'dark' ? 'light' : 'dark';
  d.dataset.t = n; store.set('salt_theme', n);
  document.querySelectorAll('.tgl').forEach(function (b) { b.textContent = n === 'dark' ? '☀️' : '🌙'; });
}
/* ---------- เชื่อมต่อ Apps Script ผ่าน fetch ---------- */
function gas(fn, args) {
  if (!window.API_URL || /XXXX/.test(window.API_URL)) return Promise.reject(new Error('ยังไม่ได้ตั้งค่า API_URL ในไฟล์ config.js'));
  return fetch(window.API_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: fn, args: args || [] }) })
    .then(function (r) { return r.text(); }, function () { throw new Error('เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ต'); })
    .then(function (t) {
      var o; try { o = JSON.parse(t); } catch (e) { throw new Error('เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง ตรวจการ Deploy (Who has access ต้องเป็น Anyone) และลิงก์ API_URL'); }
      if (o.err) throw new Error(o.err);
      return o.r;
    });
}
function call(action, p) {
  return gas('api', [S.token, action, p || {}]).then(function (r) {
    if (r && r.expired) { logout(); toast('หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่', 1); throw new Error('expired'); }
    if (!r || !r.ok) throw new Error((r && r.error) || 'เกิดข้อผิดพลาด');
    return r.data;
  });
}
async function load() {
  var d = await call('list');
  S.patients = d.patients; S.visits = d.visits; S.screens = d.screenings || []; S.last = {};
  S.visits.forEach(function (v) { if (!S.last[v.patientId] || v.date > S.last[v.patientId].date) S.last[v.patientId] = v; });
}
/* ---------- login ---------- */
function enter() {
  $('login').classList.add('hide'); $('app').classList.remove('hide');
  $('me').innerHTML = '👤 ' + esc(S.name) + '<br>' + (S.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่');
  go('dash');
}
function doLogin() {
  var u = $('u').value.trim(), p = $('p').value, er = $('err'), b = $('lb');
  if (!u || !p) { er.style.color = 'var(--r)'; er.textContent = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'; return; }
  er.style.color = 'var(--mu)'; er.textContent = 'กำลังเข้าสู่ระบบ...'; b.disabled = true;
  gas('login', [u, p]).then(function (r) {
    b.disabled = false;
    if (!r.ok) { er.style.color = 'var(--r)'; er.textContent = r.error || 'เข้าสู่ระบบไม่สำเร็จ'; return; }
    S.token = r.token; S.name = r.name; S.role = r.role;
    store.set('salt_sess', JSON.stringify({ t: r.token, n: r.name, r: r.role }));
    er.textContent = ''; $('p').value = '';
    load().then(enter).catch(function (e) { toast(e.message, 1); });
  }).catch(function (x) {
    b.disabled = false; er.style.color = 'var(--r)'; er.textContent = x.message;
  });
}
function logout() {
  S.token = ''; store.del('salt_sess'); closeModal();
  $('app').classList.add('hide'); $('login').classList.remove('hide');
}
/* ---------- navigation ---------- */
function go(tab) {
  S.tab = tab;
  document.querySelectorAll('#nav a[data-v]').forEach(function (a) { a.classList.toggle('on', a.dataset.v === tab); });
  render(); window.scrollTo(0, 0);
}
function render() {
  var v = $('view');
  v.innerHTML = '<div class="fade">' + ({ dash: vDash, pts: vPts, vis: vVis, scr: function () { return vScr(); }, prt: vPrt, set: vSet }[S.tab])() + '</div>';
  setTimeout(function () {
    document.querySelectorAll('.seg').forEach(function (e) { e.style.strokeDasharray = e.dataset.d; });
    document.querySelectorAll('[data-h]').forEach(function (e) { e.style.height = e.dataset.h + '%'; });
    document.querySelectorAll('[data-n]').forEach(function (e) {
      var n = +e.dataset.n, t0 = performance.now();
      (function f(t) { var k = Math.min(1, (t - t0) / 800); e.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0);
    });
  }, 40);
}
async function refresh() { try { await load(); render(); } catch (e) { toast(e.message, 1); } }
/* ---------- dashboard ---------- */
function stats() {
  var lim = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), ym = today().slice(0, 7);
  var lv = { green: 0, yellow: 0, red: 0, none: 0 }, od = [];
  S.patients.forEach(function (p) {
    var l = S.last[p.id]; lv[l ? l.level : 'none']++;
    if (!l || l.date < lim || l.level === 'red') od.push(p);
  });
  var ms = [], i, d, k;
  for (i = 5; i >= 0; i--) {
    d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    ms.push({ c: S.visits.filter(function (v) { return v.date.slice(0, 7) === k; }).length, l: d.toLocaleDateString('th-TH', { month: 'short' }) });
  }
  return {
    lv: lv, ms: ms, od: od, total: S.patients.length,
    month: S.visits.filter(function (v) { return v.date.slice(0, 7) === ym; }).length,
    over: S.patients.filter(function (p) { var l = S.last[p.id]; return !l || l.date < lim; }).length,
    pdpa: S.patients.filter(function (p) { return p.pdpa === 'Y'; }).length,
    ckd: S.patients.filter(function (p) { return (p.diseases || '').indexOf('ไต') >= 0; }).length
  };
}
function vDash() {
  var s = stats(), t = s.total || 1, acc = 0, max = Math.max.apply(null, s.ms.map(function (m) { return m.c; }).concat([1]));
  var C = [['👥', 'ผู้ป่วยทั้งหมด', s.total], ['🏠', 'เยี่ยมเดือนนี้', s.month], ['⏰', 'ไม่ได้เยี่ยมเกิน 30 วัน', s.over], ['🚨', 'ล่าสุดเค็มจัด', s.lv.red], ['📝', 'ให้ความยินยอม PDPA', s.pdpa], ['🫘', 'กลุ่มโรคไต', s.ckd]];
  var segs = ['green', 'yellow', 'red', 'none'].map(function (k) {
    var p = s.lv[k] / t * 100, h = '<circle class="seg" r="16" cx="21" cy="21" transform="rotate(-90 21 21)" pathLength="100" stroke="' + LV[k][1] + '" stroke-dashoffset="' + (-acc) + '" data-d="' + p + ' ' + (100 - p) + '"/>';
    acc += p; return h;
  }).join('');
  var lg = ['green', 'yellow', 'red', 'none'].map(function (k) { return '<div><i style="background:' + LV[k][1] + '"></i>' + LV[k][0] + ' <b>' + s.lv[k] + '</b></div>'; }).join('');
  var bars = s.ms.map(function (m) { return '<div><b>' + m.c + '</b><i data-h="' + Math.max(4, m.c / max * 68) + '"></i>' + m.l + '</div>'; }).join('');
  var fl = s.od.sort(function (a, b) { return ((S.last[b.id] || {}).level === 'red') - ((S.last[a.id] || {}).level === 'red'); }).slice(0, 8).map(rowP).join('');
  return '<div class="hd"><div><h2>สวัสดี ' + esc(S.name) + '</h2><span class="sub">ภาพรวมการเยี่ยมบ้านและค่าความเค็มล่าสุดของผู้ป่วย</span></div><button data-a="addV">+ บันทึกการเยี่ยม</button></div>' +
    '<div class="gs">' + C.map(function (c) { return '<div class="cd st"><i>' + c[0] + '</i><b data-n="' + c[2] + '">0</b><span>' + c[1] + '</span></div>'; }).join('') + '</div>' +
    '<div class="two"><div class="cd"><h3>ระดับความเค็มล่าสุด</h3><div class="donut"><svg viewBox="0 0 42 42"><circle r="16" cx="21" cy="21" fill="none" stroke="rgba(128,128,128,.18)" stroke-width="5"/>' + segs + '</svg><div class="lg">' + lg + '</div></div></div>' +
    '<div class="cd"><h3>จำนวนการเยี่ยม 6 เดือนล่าสุด</h3><div class="bars">' + bars + '</div></div></div>' +
    '<div class="cd lst"><h3>ควรติดตามก่อน</h3>' + (fl || '<div class="empty"><i>🎉</i>ไม่มีผู้ป่วยที่ต้องติดตามเร่งด่วน</div>') + '</div>';
}
/* ---------- patients ---------- */
function rowP(p) {
  var l = S.last[p.id], k = l ? l.level : 'none';
  return '<div class="li" data-a="viewP" data-v="' + p.id + '"><div class="av">' + esc((p.name || '?').charAt(0)) + '</div><div class="x"><b>' + esc(p.name) + '</b><span class="sub">' +
    (p.age ? p.age + ' ปี · ' : '') + (l ? 'เยี่ยมล่าสุด ' + fmtD(l.date) : 'ยังไม่เคยเยี่ยม') + '</span></div>' + badge(k) + '</div>';
}
function listP() {
  var q = S.q.trim().toLowerCase();
  var a = S.patients.filter(function (p) {
    var k = S.last[p.id] ? S.last[p.id].level : 'none';
    return (S.f === 'all' || S.f === k) && (!q || (p.name + ' ' + p.address + ' ' + p.diseases + ' ' + p.phone).toLowerCase().indexOf(q) >= 0);
  });
  return a.length ? a.map(rowP).join('') : '<div class="empty"><i>🔍</i>' + (S.patients.length ? 'ไม่พบผู้ป่วยตามเงื่อนไข' : 'ยังไม่มีผู้ป่วย กด "เพิ่มผู้ป่วย" เพื่อเริ่มต้น') + '</div>';
}
function vPts() {
  var o = [['all', 'ทั้งหมด'], ['green', 'ปกติ'], ['yellow', 'เฝ้าระวัง'], ['red', 'เค็มจัด'], ['none', 'ยังไม่ตรวจ']].map(function (x) { return '<option value="' + x[0] + '"' + (S.f === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('');
  return '<div class="hd"><h2>ผู้ป่วย (' + S.patients.length + ')</h2><button data-a="addP">+ เพิ่มผู้ป่วย</button></div>' +
    '<div class="tb"><input id="sq" placeholder="ค้นหาชื่อ ที่อยู่ โรค หรือเบอร์โทร" value="' + esc(S.q) + '"><select id="sf">' + o + '</select></div><div class="cd lst" id="pl">' + listP() + '</div>';
}
function fld(id, l, v, t, ex) { return '<label class="t" for="' + id + '">' + l + '</label><input id="' + id + '" type="' + (t || 'text') + '" value="' + esc(v) + '" ' + (ex || '') + '>'; }
function pForm(id) {
  var p = find(id) || {}, ds = (p.diseases || '').split(',');
  var ch = DIS.map(function (d) { return '<label class="ch"><input type="checkbox" name="dz" value="' + d + '"' + (ds.indexOf(d) >= 0 ? ' checked' : '') + '><span>' + d + '</span></label>'; }).join('');
  var qs = QS.map(function (q, i) { return '<label class="qr"><input type="checkbox" id="q' + (i + 1) + '"' + (p['q' + (i + 1)] === 'Y' ? ' checked' : '') + '>' + q + '</label>'; }).join('');
  openModal('<h3>' + (id ? 'แก้ไขข้อมูลผู้ป่วย' : 'เพิ่มผู้ป่วยใหม่') + '</h3><div class="g2">' + fld('pn', 'ชื่อ-นามสกุล *', p.name) + fld('pa', 'อายุ (ปี)', p.age, 'number', 'min="0" max="120"') + '</div>' +
    '<label class="t" for="pg">เพศ</label><select id="pg">' + ['ชาย', 'หญิง'].map(function (g) { return '<option' + (p.gender === g ? ' selected' : '') + '>' + g + '</option>'; }).join('') + '</select>' +
    '<label class="t" for="ad">ที่อยู่</label><textarea id="ad">' + esc(p.address) + '</textarea>' +
    '<div class="g2">' + fld('la', 'ละติจูด', p.lat, 'text', 'inputmode="decimal"') + fld('lo', 'ลองจิจูด', p.lng, 'text', 'inputmode="decimal"') + '</div>' +
    '<button class="sec sm" type="button" data-a="gps" style="margin-top:8px">📍 ใช้ตำแหน่งปัจจุบัน</button>' +
    '<div class="g2">' + fld('ph', 'เบอร์โทรผู้ป่วย', p.phone, 'tel') + fld('cn', 'ชื่อผู้ดูแล/ญาติ', p.contactName) + '</div>' + fld('cp', 'เบอร์โทรผู้ดูแล', p.contactPhone, 'tel') +
    '<label class="t">โรคประจำตัว</label>' + ch + '<label class="t" for="md">ยาที่ใช้ประจำ</label><textarea id="md">' + esc(p.meds) + '</textarea>' +
    '<label class="t">พฤติกรรมการกินเค็ม (ติ๊กข้อที่ตรง)</label>' + qs +
    '<label class="qr" style="margin-top:10px"><input type="checkbox" id="pd"' + (p.pdpa === 'Y' ? ' checked' : '') + '>ผู้ป่วยยินยอมให้เก็บและใช้ข้อมูลส่วนบุคคลตาม PDPA เพื่อการดูแลสุขภาพ</label>' +
    '<div class="row"><button class="sec" data-a="close">ยกเลิก</button><button id="sv" data-a="saveP" data-v="' + (id || '') + '">บันทึกข้อมูล</button></div>');
}
async function saveP(id) {
  var o = Object.assign({}, find(id) || {}, {
    name: $('pn').value.trim(), age: $('pa').value, gender: $('pg').value, address: $('ad').value, lat: $('la').value.trim(), lng: $('lo').value.trim(),
    phone: $('ph').value, contactName: $('cn').value, contactPhone: $('cp').value, meds: $('md').value, pdpa: $('pd').checked ? 'Y' : 'N',
    diseases: Array.prototype.map.call(document.querySelectorAll('input[name=dz]:checked'), function (e) { return e.value; }).join(',')
  });
  QS.forEach(function (q, i) { o['q' + (i + 1)] = $('q' + (i + 1)).checked ? 'Y' : 'N'; });
  if (!o.name) { toast('กรุณากรอกชื่อ-นามสกุล', 1); return; }
  $('sv').disabled = true;
  try { await call('savePatient', o); await load(); closeModal(); render(); toast('บันทึกข้อมูลผู้ป่วยแล้ว'); }
  catch (e) { toast(e.message, 1); $('sv').disabled = false; }
}
function viewP(id) {
  var p = find(id); if (!p) return;
  var vs = S.visits.filter(function (v) { return v.patientId === id; }).sort(function (a, b) { return b.date.localeCompare(a.date); });
  var qy = QS.filter(function (q, i) { return p['q' + (i + 1)] === 'Y'; }).length;
  var map = p.lat && p.lng ? 'https://www.google.com/maps?q=' + p.lat + ',' + p.lng : (p.address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.address) : '');
  var sp = '';
  if (vs.length > 1) {
    var a = vs.slice(0, 8).reverse(), mx = Math.max.apply(null, a.map(function (v) { return +v.salt; }).concat([1.2])),
      pts = a.map(function (v, i) { return (10 + i * 220 / (a.length - 1)).toFixed(1) + ',' + (60 - (+v.salt / mx) * 52).toFixed(1); }).join(' ');
    var yl = function (v, c) { var y = (60 - v / mx * 52).toFixed(1); return '<line x1="0" x2="240" y1="' + y + '" y2="' + y + '" stroke="' + c + '" stroke-dasharray="3 3" opacity=".6"/>'; };
    sp = '<label class="t">แนวโน้มค่าความเค็ม</label><svg viewBox="0 0 240 66" style="width:100%">' + yl(0.7, 'var(--g)') + yl(1, 'var(--r)') + '<polyline points="' + pts + '" fill="none" stroke="var(--p2)" stroke-width="3" stroke-linejoin="round"/></svg>';
  }
  openModal('<div class="hd"><div style="display:flex;gap:12px;align-items:center"><div class="av">' + esc(p.name.charAt(0)) + '</div><div><h3 style="margin:0">' + esc(p.name) + '</h3><span class="sub">' +
    (p.age ? p.age + ' ปี · ' : '') + esc(p.gender) + '</span></div></div>' + badge(S.last[id] ? S.last[id].level : 'none') + '</div>' +
    '<div class="kv"><b>ที่อยู่</b><span>' + esc(p.address || '-') + '</span><b>โทร</b><span>' + (p.phone ? '<a href="tel:' + esc(p.phone) + '">' + esc(p.phone) + '</a>' : '-') + '</span>' +
    '<b>ผู้ดูแล</b><span>' + esc(p.contactName || '-') + (p.contactPhone ? ' · <a href="tel:' + esc(p.contactPhone) + '">' + esc(p.contactPhone) + '</a>' : '') + '</span>' +
    '<b>โรคประจำตัว</b><span>' + esc((p.diseases || '').split(',').join(', ') || '-') + '</span><b>ยาประจำ</b><span>' + esc(p.meds || '-') + '</span>' +
    '<b>กินเค็ม</b><span>เข้าข่าย ' + qy + ' จาก ' + QS.length + ' ข้อ</span><b>PDPA</b><span>' + (p.pdpa === 'Y' ? 'ยินยอมเมื่อ ' + fmtD(p.pdpaDate) : 'ยังไม่ยินยอม') + '</span></div>' +
    (map ? '<p style="margin-top:10px"><a href="' + map + '" target="_blank" rel="noopener">🗺️ เปิดแผนที่นำทาง</a></p>' : '') + sp +
    '<label class="t">ประวัติการเยี่ยม (' + vs.length + ')</label>' + (vs.map(function (v) { return rowV(v, false); }).join('') || '<div class="empty">ยังไม่มีการเยี่ยม</div>') +
    (window.scMini ? scMini(id) : '') + '<div class="row">' + (S.role === 'admin' ? '<button class="dg sm" data-a="delP" data-v="' + id + '">ลบ</button>' : '') + '<button class="sec" data-a="prtP" data-v="' + id + '">🖨️ พิมพ์</button><button class="sec" data-a="editP" data-v="' + id + '">แก้ไข</button><button class="sec" data-a="scN" data-v="' + id + '">🩺 คัดกรอง</button><button data-a="addV" data-v="' + id + '">+ บันทึกการเยี่ยม</button></div>');
}
/* ---------- visits ---------- */
function rowV(v, name) {
  var p = find(v.patientId) || {};
  return '<div class="li" data-a="editV" data-v="' + v.id + '">' + (photosOf(v).length ? '<div style="position:relative;flex:none"><img class="th" src="' + esc(photosOf(v)[0]) + '" alt="">' + (photosOf(v).length > 1 ? '<span class="bg" style="position:absolute;right:-6px;bottom:-6px;background:var(--p2)">+' + (photosOf(v).length - 1) + '</span>' : '') + '</div>' : '<div class="av">🍲</div>') +
    '<div class="x"><b>' + (name ? esc(p.name || 'ไม่พบผู้ป่วย') : fmtD(v.date)) + '</b><span class="sub">' + (name ? fmtD(v.date) + ' · ' : '') + esc(v.menu || 'ไม่ระบุเมนู') + ' · วัดได้ ' + esc(v.salt) + '%</span></div>' + badge(v.level) + '</div>';
}
function vVis() {
  var a = S.visits.slice().sort(function (x, y) { return y.date.localeCompare(x.date) || y.createdAt.localeCompare(x.createdAt); });
  return '<div class="hd"><h2>บันทึกการเยี่ยมบ้าน (' + a.length + ')</h2><button data-a="addV">+ บันทึกการเยี่ยม</button></div><div class="cd lst">' +
    (a.map(function (v) { return rowV(v, true); }).join('') || '<div class="empty"><i>🏠</i>ยังไม่มีการเยี่ยม กด "บันทึกการเยี่ยม" เพื่อเริ่มต้น</div>') + '</div>';
}
var vPh = [], editing = null;
function phHtml() {
  return vPh.map(function (x, i) { return '<div class="pi"><img src="' + esc(x.d || x.u) + '" alt=""><button type="button" class="dg" data-a="rmPh" data-v="' + i + '" title="ลบรูป">✕</button></div>'; }).join('') || '<span class="sub">ยังไม่มีรูป</span>';
}
function vForm(pid, vid) {
  if (!S.patients.length) { toast('กรุณาเพิ่มผู้ป่วยก่อนบันทึกการเยี่ยม', 1); return; }
  var v = S.visits.filter(function (x) { return x.id === vid; })[0] || {}; editing = v.id ? v : null; vPh = photosOf(v).map(function (u) { return { u: u }; });
  var sel = pid || v.patientId || '';
  var ops = '<option value="">- เลือกผู้ป่วย -</option>' + S.patients.map(function (p) { return '<option value="' + p.id + '"' + (p.id === sel ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('');
  openModal('<h3>' + (v.id ? 'แก้ไขการเยี่ยม' : 'บันทึกการเยี่ยมบ้าน') + '</h3><label class="t" for="vp">ผู้ป่วย *</label><select id="vp">' + ops + '</select>' +
    '<div class="g2">' + fld('vd', 'วันที่เยี่ยม *', v.date || today(), 'date') + fld('vm', 'เมนูอาหารที่ตรวจ', v.menu) + '</div>' +
    fld('vs', 'ค่าความเค็มที่วัดได้ (%) *', v.salt, 'number', 'step="0.01" min="0" inputmode="decimal"') +
    '<div class="big" id="vl" style="margin-top:12px">' + (v.level ? badge(v.level) : '<span class="mu">กรอกค่าเพื่อดูระดับ</span>') + '</div><p class="sub" style="text-align:center">ปกติ ≤ 0.70 · เฝ้าระวัง 0.71–1.00 · เค็มจัด &gt; 1.00</p>' +
    '<label class="t">รูปอาหาร/การเยี่ยม (แนบได้สูงสุด 6 รูป)</label><div class="ph2"><button type="button" class="sec" data-a="cam">📷 ถ่ายภาพ</button><button type="button" class="sec" data-a="gal">🖼️ เลือกรูปจากเครื่อง</button></div>' +
    '<input id="vc" type="file" accept="image/*" capture="environment" class="hide"><input id="vf" type="file" accept="image/*" multiple class="hide"><div class="pgd" id="pvs">' + phHtml() + '</div>' +
    '<label class="t" for="vn">บันทึก/คำแนะนำที่ให้</label><textarea id="vn">' + esc(v.note) + '</textarea>' +
    '<div class="row">' + (v.id ? '<button class="dg" data-a="delV" data-v="' + v.id + '">ลบ</button><button class="sec" data-a="prtV" data-v="' + v.id + '">🖨️ พิมพ์</button>' : '') + '<button class="sec" data-a="close">ยกเลิก</button><button id="sv" data-a="saveV">บันทึกการเยี่ยม</button></div>');
}
function readImg(f) {
  return new Promise(function (res) {
    var im = new Image(), u = URL.createObjectURL(f);
    im.onload = function () {
      var k = Math.min(1, 800 / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.7));
    };
    im.onerror = function () { res(''); }; im.src = u;
  });
}
async function saveV() {
  var o = Object.assign({}, editing || {}, { patientId: $('vp').value, date: $('vd').value, menu: $('vm').value, salt: $('vs').value, note: $('vn').value });
  if (!o.patientId || !o.date || o.salt === '') { toast('กรุณาเลือกผู้ป่วย วันที่ และกรอกค่าความเค็ม', 1); return; }
  o.photo = vPh.filter(function (x) { return x.u; }).map(function (x) { return x.u; }).join('|');
  o.photosData = vPh.filter(function (x) { return x.d; }).map(function (x) { return x.d; });
  $('sv').disabled = true;
  try { await call('saveVisit', o); await load(); closeModal(); render(); toast('บันทึกการเยี่ยมแล้ว'); }
  catch (e) { toast(e.message, 1); $('sv').disabled = false; }
}
/* ---------- print ---------- */
var P = { pid: '', sel: null };
function pvList() {
  var vs = visitsOf(P.pid);
  return vs.length ? vs.map(function (v) {
    return '<label class="qr"><input type="checkbox" name="pv" value="' + v.id + '"' + (!P.sel || P.sel.indexOf(v.id) >= 0 ? ' checked' : '') + '>' + fmtD(v.date) + ' · ' + esc(v.menu || 'ไม่ระบุเมนู') + ' · ' + esc(v.salt) + '% ' + badge(v.level) + '</label>';
  }).join('') : '<div class="empty">ผู้ป่วยรายนี้ยังไม่มีการเยี่ยม</div>';
}
function vPrt() {
  var ops = '<option value="">- เลือกผู้ป่วย -</option>' + S.patients.map(function (p) { return '<option value="' + p.id + '"' + (p.id === P.pid ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('');
  return '<div class="hd np"><h2>พิมพ์บันทึกการเยี่ยม</h2></div><div class="cd np"><label class="t" for="pp">ผู้ป่วย</label><select id="pp">' + ops + '</select>' +
    '<label class="t">เลือกครั้งที่เยี่ยมที่จะพิมพ์</label><div id="pvl">' + (P.pid ? pvList() : '<div class="empty">เลือกผู้ป่วยก่อน</div>') + '</div>' +
    '<label class="qr"><input type="checkbox" id="po1" checked>แสดงรูปถ่าย</label><label class="qr"><input type="checkbox" id="po2">แสดงแบบประเมินพฤติกรรมกินเค็ม</label>' +
    '<div class="row"><button data-a="gen">สร้างเอกสาร</button></div></div><div id="sheetw"></div>';
}
function gen() {
  var p = find($('pp') ? $('pp').value : P.pid);
  if (!p) { toast('กรุณาเลือกผู้ป่วย', 1); return; }
  var ids = Array.prototype.map.call(document.querySelectorAll('input[name=pv]:checked'), function (e) { return e.value; });
  if (!ids.length) { toast('กรุณาเลือกครั้งที่เยี่ยมอย่างน้อย 1 ครั้ง', 1); return; }
  var ph = $('po1').checked, qq = $('po2').checked;
  var vs = visitsOf(p.id).filter(function (v) { return ids.indexOf(v.id) >= 0; }).reverse();
  var nl = function (t) { return esc(t || '-').replace(/\n/g, '<br>'); };
  var h = '<div class="sh"><b>โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านบัวหลวง</b><br>ตำบลเหล่า อำเภอทุ่งเขาหลวง จังหวัดร้อยเอ็ด<h2>บันทึกการเยี่ยมบ้านและตรวจค่าความเค็ม</h2></div>' +
    '<h4>ข้อมูลผู้ป่วย</h4><table><tr><td>ชื่อ-นามสกุล</td><td>' + esc(p.name) + '</td></tr><tr><td>อายุ / เพศ</td><td>' + esc(p.age || '-') + ' ปี / ' + esc(p.gender || '-') + '</td></tr>' +
    '<tr><td>ที่อยู่</td><td>' + nl(p.address) + '</td></tr><tr><td>เบอร์โทร</td><td>' + esc(p.phone || '-') + '</td></tr>' +
    '<tr><td>ผู้ดูแล/ญาติ</td><td>' + esc(p.contactName || '-') + ' ' + esc(p.contactPhone || '') + '</td></tr>' +
    '<tr><td>โรคประจำตัว</td><td>' + esc((p.diseases || '').split(',').join(', ') || '-') + '</td></tr><tr><td>ยาที่ใช้ประจำ</td><td>' + nl(p.meds) + '</td></tr></table>';
  if (qq) h += '<h4>พฤติกรรมการบริโภคเค็ม</h4>' + QS.map(function (q, i) { return '<div>' + (p['q' + (i + 1)] === 'Y' ? '☑' : '☐') + ' ' + q + '</div>'; }).join('');
  vs.forEach(function (v, i) {
    h += '<div class="vs"><h4>การเยี่ยมครั้งที่ ' + (i + 1) + ' วันที่ ' + fmtD(v.date) + '</h4><table><tr><td>ผู้เยี่ยม</td><td>' + esc(v.visitor || '-') + '</td></tr>' +
      '<tr><td>เมนูอาหารที่ตรวจ</td><td>' + esc(v.menu || '-') + '</td></tr><tr><td>ค่าความเค็มที่วัดได้</td><td>' + esc(v.salt) + ' % — ' + badge(v.level) + '</td></tr>' +
      '<tr><td>บันทึก/คำแนะนำ</td><td>' + nl(v.note) + '</td></tr></table>';
    if (ph && photosOf(v).length) h += '<div class="pg">' + photosOf(v).map(function (u) { return '<img src="' + esc(u) + '" alt="">'; }).join('') + '</div>';
    h += '</div>';
  });
  h += '<div class="sg"><div>ลงชื่อ ........................................<br>ผู้เยี่ยมบ้าน<br>(........................................)</div><div>ลงชื่อ ........................................<br>ผู้ตรวจสอบ<br>(........................................)</div></div>' +
    '<p style="text-align:right;font-size:13px;margin-top:14px">พิมพ์เมื่อ ' + fmtD(today()) + '</p>';
  $('sheetw').innerHTML = '<div class="np ph2" style="justify-content:space-between;align-items:center;margin:14px 0"><span class="sub">✏️ คลิกที่เอกสารเพื่อแก้ไขข้อความได้ก่อนพิมพ์ (กดสร้างเอกสารใหม่จะล้างสิ่งที่แก้)</span><button data-a="prn">🖨️ พิมพ์ / บันทึกเป็น PDF</button></div>' +
    '<div id="sheet" contenteditable="true" spellcheck="false">' + h + '</div>';
  $('sheetw').scrollIntoView({ behavior: 'smooth' });
}
/* ---------- settings ---------- */
function vSet() {
  return '<div class="hd"><h2>ตั้งค่า</h2></div><div class="cd"><h3>เปลี่ยนรหัสผ่าน</h3>' + fld('op', 'รหัสผ่านเดิม', '', 'password') + fld('np', 'รหัสผ่านใหม่ (อย่างน้อย 4 ตัว)', '', 'password') +
    '<div class="row"><button data-a="chpw">เปลี่ยนรหัสผ่าน</button></div></div>' +
    (S.role === 'admin' ? '<div class="cd" style="margin-top:14px"><h3>เพิ่มผู้ใช้ / รีเซ็ตรหัสผ่าน</h3><p class="sub">ถ้าชื่อผู้ใช้มีอยู่แล้ว ระบบจะตั้งรหัสผ่านใหม่ให้</p><div class="g2">' + fld('un', 'ชื่อผู้ใช้', '') + fld('uf', 'ชื่อที่แสดง', '') + '</div><div class="g2">' + fld('up', 'รหัสผ่าน', '', 'password') +
      '<div><label class="t" for="ur">สิทธิ์</label><select id="ur"><option value="user">เจ้าหน้าที่</option><option value="admin">ผู้ดูแลระบบ</option></select></div></div><div class="row"><button data-a="setu">บันทึกผู้ใช้</button></div></div>' : '') +
    '<div class="row" style="justify-content:flex-start"><button class="sec" data-a="theme">🌙 สลับโหมดมืด/สว่าง</button><button class="sec" data-a="full">⛶ เต็มหน้าจอ</button><button class="sec" data-a="logout">ออกจากระบบ</button></div>';
}
/* ---------- modal ---------- */
function openModal(h) { $('modal').innerHTML = '<div class="mb" data-a="close"></div><div class="ms" role="dialog" aria-modal="true">' + h + '</div>'; $('modal').classList.remove('hide'); }
function closeModal() { if (typeof camStop === 'function') camStop(); $('modal').classList.add('hide'); $('modal').innerHTML = ''; }
function ask(msg, fn) {
  openModal('<h3>ยืนยันการลบ</h3><p>' + esc(msg) + '</p><div class="row"><button class="sec" data-a="close">ยกเลิก</button><button class="dg" id="ok">ลบ</button></div>');
  $('ok').onclick = function () { $('ok').disabled = true; fn(); };
}
async function del(act, id, msg) {
  try { await call(act, { id: id }); await load(); closeModal(); render(); toast(msg); } catch (e) { toast(e.message, 1); closeModal(); }
}
/* ---------- กล้องถ่ายภาพ (เปิดกล้องในหน้าเว็บ) ---------- */
var camStream = null, camFacing = 'environment';
function camStop() {
  if (camStream) { camStream.getTracks().forEach(function (t) { t.stop(); }); camStream = null; }
  var o = document.getElementById('camov'); if (o) o.remove();
}
async function camStart() {
  if (camStream) { camStream.getTracks().forEach(function (t) { t.stop(); }); camStream = null; }
  var v = document.getElementById('camv');
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: camFacing }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
  } catch (e) {
    camStop();
    toast('เปิดกล้องในหน้าเว็บไม่ได้ (' + (e && e.name === 'NotAllowedError' ? 'ระบบ/เบราว์เซอร์ไม่อนุญาต' : 'ไม่พบกล้อง') + ') กรุณาเลือกรูปจากไฟล์แทน', 1);
    var c = document.getElementById('vc'); if (c) c.click();
    return;
  }
  if (v) { v.srcObject = camStream; v.play().catch(function () {}); }
}
function camOpen() {
  if (vPh.length >= 6) { toast('แนบได้สูงสุด 6 รูปต่อครั้ง', 1); return; }
  /* มือถือ/แท็บเล็ต: เรียกแอปกล้องของเครื่องโดยตรง (เสถียรที่สุด) ส่วนคอมใช้กล้องในหน้าเว็บ */
  if ((window.matchMedia && matchMedia('(pointer:coarse)').matches) || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('vc').click(); return; }
  camStop();
  var o = document.createElement('div'); o.id = 'camov';
  o.style.cssText = 'position:fixed;inset:0;z-index:80;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center';
  o.innerHTML = '<video id="camv" playsinline muted autoplay style="max-width:100%;max-height:calc(100% - 110px);flex:1;min-height:0;object-fit:contain"></video>' +
    '<div style="display:flex;gap:12px;align-items:center;justify-content:center;padding:16px;flex-wrap:wrap">' +
    '<button type="button" class="sec" data-a="camX">✖ ปิด</button>' +
    '<button type="button" data-a="camShot" style="font-size:18px;padding:12px 28px">📸 ถ่ายภาพ</button>' +
    '<button type="button" class="sec" data-a="camFlip">🔄 สลับกล้อง</button>' +
    '<span id="camn" style="color:#fff;font-size:14px"></span></div>';
  document.body.appendChild(o);
  camNote(); camStart();
}
function camNote() { var n = document.getElementById('camn'); if (n) n.textContent = 'ถ่ายแล้ว ' + vPh.length + '/6 รูป'; }
function camShot() {
  var v = document.getElementById('camv');
  if (!v || !v.videoWidth) { toast('กล้องยังไม่พร้อม รอสักครู่', 1); return; }
  if (vPh.length >= 6) { toast('แนบได้สูงสุด 6 รูปต่อครั้ง', 1); return; }
  var k = Math.min(1, 800 / Math.max(v.videoWidth, v.videoHeight)), c = document.createElement('canvas');
  c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  vPh.push({ d: c.toDataURL('image/jpeg', 0.7) });
  var p = $('pvs'); if (p) p.innerHTML = phHtml();
  camNote(); toast('บันทึกรูปที่ ' + vPh.length + ' แล้ว');
  if (vPh.length >= 6) camStop();
}
/* ---------- events ---------- */
var A = {
  theme: theme, close: closeModal,
  full: function () {
    var d = document, e = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
    var f = e.requestFullscreen || e.webkitRequestFullscreen;
    if (!f) { toast('เครื่องนี้ไม่รองรับเต็มจอ บน iPhone/iPad ให้กดแชร์ > เพิ่มลงหน้าจอโฮม', 1); return; }
    var r = f.call(e);
    if (r && r.catch) r.catch(function () { toast('เบราว์เซอร์ไม่อนุญาตเต็มจอในหน้านี้ ลองกด F11 (คอมพิวเตอร์) หรือเพิ่มลงหน้าจอโฮม', 1); });
  }, login: doLogin, logout: logout,
  go: function (v) { go(v); },
  pw: function () { var p = $('p'); p.type = p.type === 'password' ? 'text' : 'password'; },
  forgot: function () { $('err').style.color = 'var(--mu)'; $('err').textContent = 'กรุณาติดต่อผู้ดูแลระบบ (admin) เพื่อรีเซ็ตรหัสผ่านหรือเพิ่มผู้ใช้ใหม่'; },
  test: function () {
    var er = $('err'); er.style.color = 'var(--mu)'; er.textContent = 'กำลังตรวจสอบ...';
    gas('ping', []).then(function (r) { er.style.color = /^ต่อชีตได้/.test(r) ? 'var(--g)' : 'var(--r)'; er.textContent = r; })
      .catch(function (x) { er.style.color = 'var(--r)'; er.textContent = x.message; });
  },
  install: function () {
    if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; $('inst').classList.add('hide'); }
    else toast('iPhone/iPad: กดปุ่มแชร์ แล้วเลือก "เพิ่มไปยังหน้าจอโฮม"');
  },
  addP: function () { pForm(''); }, editP: function (id) { pForm(id); }, saveP: function (id) { saveP(id); },
  viewP: function (id) { viewP(id); },
  delP: function (id) { ask('ลบผู้ป่วยรายนี้ ประวัติการเยี่ยม และผลคัดกรองทั้งหมด? ย้อนกลับไม่ได้', function () { del('deletePatient', id, 'ลบผู้ป่วยแล้ว'); }); },
  addV: function (id) { vForm(id || '', ''); }, editV: function (id) { vForm('', id); }, saveV: saveV,
  delV: function (id) { ask('ลบบันทึกการเยี่ยมนี้?', function () { del('deleteVisit', id, 'ลบบันทึกแล้ว'); }); },
  gps: function () {
    if (!navigator.geolocation) { toast('อุปกรณ์นี้ไม่รองรับ GPS กรุณากรอกพิกัดเอง', 1); return; }
    navigator.geolocation.getCurrentPosition(function (r) { $('la').value = r.coords.latitude.toFixed(6); $('lo').value = r.coords.longitude.toFixed(6); toast('ได้พิกัดแล้ว'); },
      function () { toast('ขอพิกัดไม่ได้ กรุณาอนุญาตตำแหน่ง หรือกรอกพิกัดเอง', 1); }, { enableHighAccuracy: true, timeout: 10000 });
  },
  cam: camOpen, camShot: camShot, camX: camStop, camFlip: function () { camFacing = camFacing === 'environment' ? 'user' : 'environment'; camStart(); }, gal: function () { $('vf').click(); },
  rmPh: function (i) { vPh.splice(+i, 1); $('pvs').innerHTML = phHtml(); },
  gen: function () { gen(); },
  prn: function () {
    if (!$('sheet')) { toast('กรุณากด "สร้างเอกสาร" ก่อน', 1); return; }
    try { window.print(); } catch (e) { toast('เปิดหน้าต่างพิมพ์ไม่ได้ ลองกด Ctrl+P', 1); }
  },
  prtV: function (id) { var v = S.visits.filter(function (x) { return x.id === id; })[0]; if (!v) return; P.pid = v.patientId; P.sel = [id]; closeModal(); go('prt'); gen(); },
  prtP: function (id) { P.pid = id; P.sel = null; closeModal(); go('prt'); gen(); },
  chpw: async function () {
    try { await call('changePw', { old: $('op').value, pw: $('np').value }); $('op').value = ''; $('np').value = ''; toast('เปลี่ยนรหัสผ่านแล้ว'); } catch (e) { toast(e.message, 1); }
  },
  setu: async function () {
    try { await call('setUser', { username: $('un').value, name: $('uf').value, pw: $('up').value, role: $('ur').value }); ['un', 'uf', 'up'].forEach(function (i) { $(i).value = ''; }); toast('บันทึกผู้ใช้แล้ว'); } catch (e) { toast(e.message, 1); }
  }
};
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-a]'); if (!el || !A[el.dataset.a]) return;
  e.preventDefault(); A[el.dataset.a](el.dataset.v, el);
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && (e.target.id === 'p' || e.target.id === 'u') && !$('login').classList.contains('hide')) doLogin();
  if (e.key === 'Escape') { if (document.getElementById('camov')) camStop(); else closeModal(); }
});
document.addEventListener('input', function (e) {
  if (e.target.id === 'sq') { S.q = e.target.value; $('pl').innerHTML = listP(); }
  if (e.target.id === 'vs') { var v = e.target.value; $('vl').innerHTML = v === '' || isNaN(+v) ? '<span class="mu">กรอกค่าเพื่อดูระดับ</span>' : badge(lvOf(v)); }
});
document.addEventListener('change', async function (e) {
  if (e.target.id === 'sf') { S.f = e.target.value; $('pl').innerHTML = listP(); }
  if (e.target.id === 'pp') { P.pid = e.target.value; P.sel = null; $('pvl').innerHTML = P.pid ? pvList() : '<div class="empty">เลือกผู้ป่วยก่อน</div>'; }
  if ((e.target.id === 'vf' || e.target.id === 'vc') && e.target.files.length) {
    var fs = Array.prototype.slice.call(e.target.files), full = false;
    for (var i = 0; i < fs.length; i++) {
      if (vPh.length >= 6) { full = true; break; }
      var d = await readImg(fs[i]);
      if (d) vPh.push({ d: d }); else toast('อ่านรูปบางรูปไม่ได้', 1);
    }
    e.target.value = ''; $('pvs').innerHTML = phHtml();
    if (full) toast('แนบได้สูงสุด 6 รูปต่อครั้ง', 1);
  }
});
/* ---------- ติดตั้งแอป (PWA) ---------- */
var deferredInstall = null;
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; $('inst').classList.remove('hide'); });
window.addEventListener('appinstalled', function () { $('inst').classList.add('hide'); });
(function () {
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent), standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
  if (ios && !standalone) $('inst').classList.remove('hide');
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
})();
/* ---------- start ---------- */
(function () {
  if (store.get('salt_theme') === 'dark') theme();
  var s = null; try { s = JSON.parse(store.get('salt_sess') || 'null'); } catch (e) {}
  if (s && s.t) {
    S.token = s.t; S.name = s.n; S.role = s.r;
    load().then(enter).catch(function (e) { if (e.message !== 'expired') toast(e.message, 1); S.token = ''; });
  }
})();
