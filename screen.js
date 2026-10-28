'use strict';
/* ===== คัดกรองความเสี่ยงโรคเบาหวานและความดันโลหิตสูง (สัมภาษณ์ + วัดค่า) =====
 * เกณฑ์ประเมินอยู่ในฟังก์ชัน scEval() ที่เดียว ปรับตัวเลขได้ตามแนวทางของหน่วยงาน */
S.screens = [];
var RK = { green: ['ปกติ', 'var(--g)'], yellow: ['เฝ้าระวัง', 'var(--y)'], red: ['เสี่ยงสูง', 'var(--r)'], none: ['ยังไม่คัดกรอง', 'var(--mu)'] };
function rb(k, t) { var r = RK[k] || RK.none; return '<span class="bg" style="background:' + r[1] + '">' + esc(t || r[0]) + '</span>'; }
var FAM = [['DM', 'เบาหวาน (DM)'], ['HT', 'ความดันโลหิตสูง (HT)'], ['GT', 'โรคเกาท์ (Gout)'], ['CRF', 'ไตวายเรื้อรัง (CRF)'], ['MI', 'กล้ามเนื้อหัวใจตาย (MI)'], ['ST', 'เส้นเลือดสมอง (Stroke)'], ['COPD', 'ถุงลมโป่งพอง (COPD)'], ['UK', 'ไม่ทราบ']];
var HX3 = [['dm', 'โรคเบาหวาน'], ['ht', 'โรคความดันโลหิตสูง'], ['lv', 'โรคตับ'], ['pa', 'โรคอัมพาต'], ['hd', 'โรคหัวใจ'], ['ld', 'ไขมันในเลือดผิดปกติ']];
var HX2 = [['ft', 'แผลที่เท้า/ตัดขา (จากเบาหวาน)'], ['bb', 'คลอดบุตรน้ำหนักเกิน 4 กิโลกรัม หรือเป็นเบาหวานขณะตั้งครรภ์'], ['pd', 'ดื่มน้ำบ่อยและมาก'], ['nu', 'ปัสสาวะกลางคืน 3 ครั้งขึ้นไป'],
  ['ea', 'กินจุแต่ผอมลง'], ['wl', 'น้ำหนักลด / อ่อนเพลีย'], ['ul', 'เป็นแผลริมฝีปากบ่อยและหายยาก'], ['it', 'คันตามผิวหนังและอวัยวะสืบพันธุ์'], ['bv', 'ตาพร่ามัว ต้องเปลี่ยนแว่นบ่อย'],
  ['nb', 'ชาตามปลายมือปลายเท้าโดยไม่ทราบสาเหตุ'], ['ac', 'มีรอยพับรอบคอหรือใต้รักแร้ดำ'], ['hg', 'ประวัติมีน้ำตาลในเลือดสูง (FPG 100-125) (OGTT 140-199)']];
var TXQ = [['1', 'รับการรักษาอยู่/ปฏิบัติตามที่แพทย์แนะนำ'], ['2', 'รับการรักษาแต่ไม่สม่ำเสมอ'], ['3', 'เคยรักษา ขณะนี้ไม่รักษา/หายาทานเอง']];
var EXQ = ['ออกกำลังกายทุกวัน ครั้งละ 30 นาที', 'ออกกำลังกายสัปดาห์ละมากกว่า 3 ครั้ง ครั้งละ 30 นาที สม่ำเสมอ', 'ออกกำลังกายสัปดาห์ละ 3 ครั้ง ครั้งละ 30 นาที สม่ำเสมอ', 'ออกกำลังกายน้อยกว่าสัปดาห์ละ 3 ครั้ง', 'ไม่ออกกำลังกายเลย'];
var ALQ = [['no', 'ไม่ดื่ม'], ['oc', 'ดื่มบางโอกาส'], ['rg', 'ดื่มเป็นประจำ'], ['qt', 'เคยดื่มแต่เลิกแล้ว']];
var FDQ = [['sweet', 'หวาน'], ['salt', 'เค็ม'], ['fat', 'มัน'], ['none', 'ไม่ชอบทุกข้อ']];
var scEdit = null;

function nz(v) { v = parseFloat(v); return isNaN(v) ? null : v; }
function nowT() { var d = new Date(), z = function (n) { return ('0' + n).slice(-2); }; return z(d.getHours()) + ':' + z(d.getMinutes()); }
function labOf(list, k) { var r = list.filter(function (x) { return x[0] === k; })[0]; return r ? r[1] : k; }
function parseIv(t) {
  var o = {}; try { o = JSON.parse(t || '{}') || {}; } catch (e) { o = {}; }
  o.hx = o.hx || {}; o.sy = o.sy || {}; o.sm = o.sm || {}; o.al = o.al || {}; o.fm = o.fm || []; o.sb = o.sb || []; o.fd = o.fd || [];
  return o;
}
function scNorm(s) { return Object.assign({}, s, { interview: parseIv(s.interview) }); }

/* ---------- เกณฑ์ประเมิน (แก้ตัวเลขได้ที่นี่) ---------- */
function scEval(o, gender) {
  var r = { f: [] }, iv = o.interview || {}, w = nz(o.weight), h = nz(o.height), wa = nz(o.waist);
  r.bmi = w > 0 && h > 0 ? +(w / Math.pow(h / 100, 2)).toFixed(1) : null;
  if (r.bmi !== null) r.bmiLv = r.bmi >= 25 ? ['red', 'อ้วน'] : r.bmi >= 23 ? ['yellow', 'น้ำหนักเกิน'] : r.bmi < 18.5 ? ['yellow', 'น้ำหนักน้อย'] : ['green', 'ปกติ'];
  if (wa !== null && gender) { var lim = gender === 'หญิง' ? 80 : 90; r.waLv = wa >= lim ? ['yellow', 'รอบเอวเกิน (≥' + lim + ')'] : ['green', 'ปกติ']; }
  var g = nz(o.sugar), fast = o.sugarType !== 'RBS';
  if (g !== null) {
    r.su = g;
    r.suLv = g < 70 ? ['yellow', 'ต่ำ (<70)'] : fast ? (g >= 126 ? ['red', 'สูง (≥126)'] : g >= 100 ? ['yellow', 'เสี่ยง (100–125)'] : ['green', 'ปกติ'])
      : (g >= 200 ? ['red', 'สูง (≥200)'] : g >= 140 ? ['yellow', 'เฝ้าระวัง (140–199)'] : ['green', 'ปกติ']);
  }
  var S1 = [], D1 = [];
  [['sbp1', 'dbp1'], ['sbp2', 'dbp2']].forEach(function (k) { var a = nz(o[k[0]]), b = nz(o[k[1]]); if (a !== null && b !== null) { S1.push(a); D1.push(b); } });
  if (S1.length) {
    var av = function (a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; };
    r.sys = Math.round(av(S1)); r.dia = Math.round(av(D1));
    r.bpLv = (r.sys >= 140 || r.dia >= 90) ? ['red', 'สูง (≥140/90)'] : (r.sys >= 120 || r.dia >= 80) ? ['yellow', 'เฝ้าระวัง (120–139/80–89)'] : ['green', 'ปกติ'];
  }
  var sy = HX2.filter(function (x) { return (iv.sy || {})[x[0]] === 'Y'; }).length;
  var fam = (iv.fm || []).concat(iv.sb || []).some(function (k) { return k === 'DM' || k === 'HT'; });
  if (fam) r.f.push('ญาติสายตรงเป็นเบาหวาน/ความดันสูง');
  if ((iv.hx || {}).dm === 'Y') r.f.push('เป็นเบาหวานอยู่แล้ว');
  if ((iv.hx || {}).ht === 'Y') r.f.push('เป็นความดันสูงอยู่แล้ว');
  if (sy) r.f.push('มีอาการเข้าข่ายเบาหวาน ' + sy + ' ข้อ');
  if ((iv.sm || {}).st === 'yes') r.f.push('สูบบุหรี่');
  if ((iv.al || {}).st === 'rg') r.f.push('ดื่มแอลกอฮอล์เป็นประจำ');
  if (+iv.ex >= 4) r.f.push('ออกกำลังกายน้อย');
  if ((iv.fd || []).some(function (k) { return k !== 'none'; })) r.f.push('ชอบอาหาร' + (iv.fd || []).filter(function (k) { return k !== 'none'; }).map(function (k) { return labOf(FDQ, k); }).join('/'));
  var rank = { green: 0, yellow: 1, red: 2 }, m = 0;
  [r.bpLv, r.suLv].forEach(function (x) { if (x) m = Math.max(m, rank[x[0]]); });
  if (m === 0 && ((r.bmi !== null && r.bmi >= 23) || (r.waLv && r.waLv[0] === 'yellow') || sy)) m = 1;
  r.overall = (r.bpLv || r.suLv || r.bmiLv || r.waLv) ? ['green', 'yellow', 'red'][m] : 'none';
  return r;
}
function scSum(ev) {
  var c = [];
  if (ev.bmi !== null) c.push('BMI ' + ev.bmi.toFixed(1) + ' ' + rb(ev.bmiLv[0], ev.bmiLv[1]));
  if (ev.waLv) c.push('รอบเอว ' + rb(ev.waLv[0], ev.waLv[1]));
  if (ev.suLv) c.push('น้ำตาล ' + ev.su + ' ' + rb(ev.suLv[0], ev.suLv[1]));
  if (ev.bpLv) c.push('ความดัน ' + ev.sys + '/' + ev.dia + ' ' + rb(ev.bpLv[0], ev.bpLv[1]));
  var ov = { green: 'ความเสี่ยงต่ำ', yellow: 'เฝ้าระวัง', red: 'เสี่ยงสูง ควรส่งพบแพทย์', none: 'ยังไม่มีข้อมูลพอประเมิน' }[ev.overall];
  return '<div style="text-align:center;margin-bottom:8px"><span class="mu">สรุปผล </span>' + rb(ev.overall, ov) + '</div>' +
    (c.length ? '<div class="sub" style="display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:center">' + c.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' : '') +
    (ev.f.length ? '<p class="sub" style="margin-top:8px;text-align:center">ปัจจัยเสี่ยง: ' + esc(ev.f.join(' · ')) + '</p>' : '');
}

/* ---------- ส่วนประกอบฟอร์ม ---------- */
var scStep = 1, scPid = '', SCN = 5;
var STEPS = [['👤', 'ข้อมูลทั่วไป'], ['👪', 'ประวัติสุขภาพ'], ['🚬', 'พฤติกรรม'], ['🩸', 'ผลตรวจ'], ['✅', 'สรุปและบันทึก']];
function hd(t) { return '<label class="t" style="font-size:15px;color:var(--tx)">' + t + '</label>'; }
function chk(n, v, l, on) { return '<label class="ch"><input type="checkbox" name="' + n + '" value="' + v + '"' + (on ? ' checked' : '') + '><span>' + l + '</span></label>'; }
function rad(n, v, l, on) { return '<label class="ch"><input type="radio" name="' + n + '" value="' + v + '"' + (on ? ' checked' : '') + '><span>' + l + '</span></label>'; }
function qa(l, chips) { return '<div class="qa"><span class="qt">' + l + '</span><span class="qo">' + chips + '</span></div>'; }
function card(t, h, extra) { return '<div class="cd scc"><div class="sct">' + t + '</div>' + (extra || '') + h + '</div>'; }

function scP2(iv) {
  var fam = function (n, a) { return FAM.map(function (x) { return chk(n, x[0], x[1], a.indexOf(x[0]) >= 0); }).join(''); };
  var tools = '<div class="ph2" style="margin:0 0 6px"><button type="button" class="sec sm" data-a="scAllN">✔ ตอบ "ไม่มี" ข้อที่ยังไม่ได้ตอบ</button><button type="button" class="sec sm" data-a="scRst">↺ ล้างคำตอบ</button></div>';
  return card('👪 ประวัติครอบครัว', hd('บิดาหรือมารดามีประวัติเจ็บป่วยด้วย') + fam('fm', iv.fm) + fld('sc_fmo', 'อื่นๆ', iv.fmo) +
      '<div style="height:12px"></div>' + hd('พี่น้อง (สายตรง) มีประวัติเจ็บป่วยด้วย') + fam('sb', iv.sb) + fld('sc_sbo', 'อื่นๆ', iv.sbo)) +
    card('🩺 ประวัติการเจ็บป่วยของผู้ป่วย', HX3.map(function (x) {
      var v = iv.hx[x[0]], n = 'hx_' + x[0]; return qa(x[1], rad(n, 'Y', 'มี', v === 'Y') + rad(n, 'N', 'ไม่มี', v === 'N') + rad(n, 'U', 'ไม่เคยตรวจ', v === 'U'));
    }).join(''), '<p class="sub" style="margin-bottom:6px">ท่านมีประวัติเจ็บป่วย หรือต้องพบแพทย์ด้วยโรคหรืออาการต่อไปนี้หรือไม่</p>' + tools) +
    card('🔎 อาการที่พบ', HX2.map(function (x) {
      var v = iv.sy[x[0]], n = 'sy_' + x[0]; return qa(x[1], rad(n, 'Y', 'มี', v === 'Y') + rad(n, 'N', 'ไม่มี', v === 'N'));
    }).join('')) +
    card('💊 การปฏิบัติตนหากมีประวัติเจ็บป่วย', TXQ.map(function (x) { return '<div>' + rad('tx', x[0], x[1], iv.tx === x[0]) + '</div>'; }).join(''));
}
function scP3(iv) {
  var sm = iv.sm, al = iv.al;
  return card('🚬 การสูบบุหรี่', rad('sms', 'no', 'ไม่สูบ', sm.st === 'no') + rad('sms', 'yes', 'สูบ', sm.st === 'yes') +
      '<div class="g2">' + fld('sc_smc', 'จำนวน (มวน/วัน)', sm.cig, 'number', 'min="0" inputmode="numeric"') + fld('sc_smy', 'ระยะเวลาที่สูบ (ปี) จนถึงปัจจุบัน', sm.yr, 'number', 'min="0"') + '</div>' +
      '<div class="g2">' + fld('sc_smp', 'จำนวน (Pack/ปี) คำนวณให้อัตโนมัติ', sm.pk, 'number', 'step="0.1" min="0"') + fld('sc_smt', 'ชนิดของบุหรี่', sm.ty) + '</div>' +
      '<label class="qr" style="margin-top:12px"><input type="checkbox" id="sc_smq"' + (sm.qt === 'Y' ? ' checked' : '') + '>เคยสูบแต่เลิกแล้ว</label>' +
      '<div class="g2">' + fld('sc_smqt', 'ชนิดของบุหรี่ที่เคยสูบ', sm.qty) + fld('sc_smqy', 'ระยะเวลาที่สูบ (ปี) จนหยุดสูบ', sm.qyr, 'number', 'min="0"') + '</div>') +
    card('🍺 การดื่มแอลกอฮอล์', ALQ.map(function (x) { return rad('als', x[0], x[1], al.st === x[0]); }).join('') +
      '<div class="g2">' + fld('sc_alf', 'ความถี่ (ครั้ง/สัปดาห์)', al.fq, 'number', 'min="0" max="7"') + fld('sc_alt', 'ชนิดเครื่องดื่ม', al.ty) + '</div>' + fld('sc_aly', 'ระยะเวลาที่ดื่ม (ปี)', al.yr, 'number', 'min="0"')) +
    card('🏃 การออกกำลังกาย', EXQ.map(function (t, i) { return '<div>' + rad('ex', String(i + 1), t, iv.ex === String(i + 1)) + '</div>'; }).join('')) +
    card('🍽️ การรับประทานอาหาร', hd('ท่านชอบอาหารรสใด (เลือกได้หลายข้อ)') + FDQ.map(function (x) { return chk('fd', x[0], x[1], iv.fd.indexOf(x[0]) >= 0); }).join(''));
}

/* ---------- หน้าคัดกรองแบบเต็มหน้าจอ ---------- */
function scForm(pid, sid) {
  if (!S.patients.length) { toast('กรุณาเพิ่มผู้ป่วยก่อนคัดกรอง', 1); return; }
  scEdit = S.screens.filter(function (x) { return x.id === sid; })[0] || null; scPid = pid || ''; scStep = 1;
  closeModal(); go('scf');
  var a = document.querySelector('#nav a[data-v=scr]'); if (a) a.classList.add('on');
  scShow(1); scUp();
}
function vScf() {
  var s = scEdit || {}, iv = parseIv(s.interview), sel = s.patientId || scPid || '', nm = 'step="0.1" min="0" inputmode="decimal"', num = 'min="0" inputmode="numeric"';
  var ops = '<option value="">- เลือกผู้ป่วย -</option>' + S.patients.map(function (p) { return '<option value="' + p.id + '"' + (p.id === sel ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('');
  var stp = STEPS.map(function (t, i) { return '<a class="sp" data-a="scG" data-v="' + (i + 1) + '"><b>' + (i + 1) + '</b><span>' + t[1] + '</span></a>'; }).join('');
  var part = function (n, h) { return '<div class="scpart scp' + (n === 1 ? '' : ' hide') + '" id="scp_' + n + '">' + h + '</div>'; };
  var p1 = card('👤 ข้อมูลผู้ป่วย', '<label class="t" for="sc_p">ผู้ป่วย *</label><select id="sc_p">' + ops + '</select><p class="sub" id="sc_pi" style="margin-top:6px"></p>' +
      '<div class="g2">' + fld('sc_d', 'วันที่คัดกรอง *', s.date || today(), 'date') + fld('sc_t', 'เวลา', s.time || nowT(), 'time') + '</div>') +
    card('⚖️ การวัดร่างกาย', '<div class="g2">' + fld('sc_w', 'น้ำหนัก (กก.)', s.weight, 'number', nm) + fld('sc_h', 'ส่วนสูง (ซม.)', s.height, 'number', nm) + '</div>' +
      '<div class="g2">' + fld('sc_o', 'รอบเอว (ซม.)', s.waist, 'number', nm) + fld('sc_b', 'BMI (คำนวณให้อัตโนมัติ)', s.bmi, 'text', 'readonly') + '</div>');
    var p4 = card('🩸 ระดับน้ำตาลในเลือด <span id="sc_gb"></span>', '<label class="t" for="sc_gt">ประเภทการตรวจ</label><select id="sc_gt"><option value="FBS"' + (s.sugarType !== 'RBS' ? ' selected' : '') + '>งดอาหารอย่างน้อย 8 ชั่วโมง (FPG)</option><option value="RBS"' + (s.sugarType === 'RBS' ? ' selected' : '') + '>ไม่ได้งดอาหาร (สุ่มตรวจ)</option></select>' +
      fld('sc_g', 'ค่าน้ำตาลในเลือด (mg/dL)', s.sugar, 'number', 'min="0" inputmode="decimal"') +
      '<p class="sub" style="margin-top:8px">งดอาหาร: ปกติ &lt; 100 · เสี่ยง 100–125 · สูง ≥ 126<br>ไม่งดอาหาร: ปกติ &lt; 140 · เฝ้าระวัง 140–199 · สูง ≥ 200</p>') +
    card('❤️ ความดันโลหิต <span id="sc_bb"></span>', '<div class="g2">' + fld('sc_s1', 'ครั้งที่ 1 ตัวบน (SYS)', s.sbp1, 'number', num) + fld('sc_d1', 'ครั้งที่ 1 ตัวล่าง (DIA)', s.dbp1, 'number', num) +
      fld('sc_s2', 'ครั้งที่ 2 ตัวบน (ถ้ามี)', s.sbp2, 'number', num) + fld('sc_d2', 'ครั้งที่ 2 ตัวล่าง (ถ้ามี)', s.dbp2, 'number', num) + '</div>' + fld('sc_hr', 'ชีพจร (ครั้ง/นาที)', s.pulse, 'number', num) +
      '<p class="sub" style="margin-top:8px">ปกติ &lt; 120/80 · เฝ้าระวัง 120–139 / 80–89 · สูง ≥ 140/90 (ใช้ค่าเฉลี่ยของครั้งที่วัด)</p>');
  var p5 = card('📊 สรุปผลการคัดกรอง', '<div id="sc_sum"></div><p class="sub" style="margin-top:8px;text-align:center">ผลคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัย ผู้ที่ค่าผิดปกติควรได้รับการยืนยันโดยแพทย์</p>') +
    card('📝 บันทึก/คำแนะนำที่ให้', '<textarea id="sc_n" style="min-height:110px">' + esc(s.note) + '</textarea>');
  return '<div class="hd np"><div><h2>' + (s.id ? 'แก้ไขผลคัดกรอง' : 'คัดกรองความเสี่ยงเบาหวานและความดัน') + '</h2><span class="sub">กรอกทีละขั้นตอน ผลสรุปอัปเดตให้ทันที</span></div>' +
    '<div class="ph2">' + (s.id ? '<button class="sec sm" data-a="scP" data-v="' + s.id + '">🖨️ พิมพ์</button><button class="dg sm" data-a="scD" data-v="' + s.id + '">🗑️ ลบ</button>' : '') + '<button class="sec sm" data-a="scQ">✖ ปิด</button></div></div>' +
    '<div id="scf" class="scw"><div class="scm"><div class="stp np">' + stp + '</div>' +
    part(1, p1) + part(2, cpBtn() + scP2(iv)) + part(3, scP3(iv)) + part(4, p4) + part(5, p5) +
    '<div class="scbar np"><button class="sec" id="sc_bk" data-a="scB">← ย้อนกลับ</button><span class="sub" id="sc_pg"></span><button id="sc_nx" data-a="scNx">ถัดไป →</button>' +
    '<span id="sc_end" class="ph2 hide" style="margin:0"><button class="sec" data-a="scSP">💾🖨️ บันทึกและพิมพ์</button><button id="sv" data-a="scS">💾 บันทึก</button></span></div></div>' +
    '<aside class="scside cd np"><div id="sc_side"></div></aside></div>';
}
function scShow(n) {
  scStep = n;
  document.querySelectorAll('#scf .scpart').forEach(function (e) { e.classList.toggle('hide', e.id !== 'scp_' + n); });
  document.querySelectorAll('#scf .sp').forEach(function (e, i) { e.classList.toggle('on', i + 1 === n); e.classList.toggle('ok', i + 1 < n); e.firstChild.textContent = i + 1 < n ? '✓' : String(i + 1); });
  $('sc_bk').style.visibility = n === 1 ? 'hidden' : 'visible';
  $('sc_nx').classList.toggle('hide', n === SCN); $('sc_end').classList.toggle('hide', n !== SCN);
  $('sc_pg').textContent = 'ขั้นตอน ' + n + '/' + SCN + ' · ' + STEPS[n - 1][1];
  window.scrollTo(0, 0);
}
function scGo(n) {
  n = +n;
  if (n > 1 && (!$('sc_p').value || !$('sc_d').value)) { toast('กรุณาเลือกผู้ป่วยและวันที่ก่อน', 1); scShow(1); return; }
  scShow(Math.max(1, Math.min(SCN, n)));
}

/* ---------- อ่านค่า / อัปเดตสรุป / บันทึก ---------- */
function scObj() {
  var g = function (id) { var e = $(id); return e ? e.value : ''; };
  var all = function (n) { return Array.prototype.map.call(document.querySelectorAll('#scf input[name=' + n + ']:checked'), function (e) { return e.value; }); };
  var one = function (n) { return all(n)[0] || ''; };
  var iv = { fm: all('fm'), fmo: g('sc_fmo'), sb: all('sb'), sbo: g('sc_sbo'), hx: {}, sy: {}, tx: one('tx'),
    sm: { st: one('sms'), cig: g('sc_smc'), yr: g('sc_smy'), pk: g('sc_smp'), ty: g('sc_smt'), qt: $('sc_smq') && $('sc_smq').checked ? 'Y' : '', qty: g('sc_smqt'), qyr: g('sc_smqy') },
    al: { st: one('als'), fq: g('sc_alf'), ty: g('sc_alt'), yr: g('sc_aly') }, ex: one('ex'), fd: all('fd') };
  HX3.forEach(function (x) { iv.hx[x[0]] = one('hx_' + x[0]); });
  HX2.forEach(function (x) { iv.sy[x[0]] = one('sy_' + x[0]); });
  return { patientId: g('sc_p'), date: g('sc_d'), time: g('sc_t'), weight: g('sc_w'), height: g('sc_h'), waist: g('sc_o'), sugarType: g('sc_gt'), sugar: g('sc_g'),
    sbp1: g('sc_s1'), dbp1: g('sc_d1'), sbp2: g('sc_s2'), dbp2: g('sc_d2'), pulse: g('sc_hr'), note: g('sc_n'), interview: iv };
}
function scUp() {
  if (!$('sc_sum')) return;
  var o = scObj(), p = find(o.patientId), ev = scEval(o, p && p.gender);
  $('sc_b').value = ev.bmi === null ? '' : ev.bmi.toFixed(1);
  $('sc_pi').textContent = p ? (p.age ? p.age + ' ปี · ' : '') + (p.gender || '') + (p.diseases ? ' · โรคประจำตัว: ' + p.diseases.split(',').join(', ') : '') : '';
  $('sc_gb').innerHTML = ev.suLv ? rb(ev.suLv[0], ev.suLv[1]) : ''; $('sc_bb').innerHTML = ev.bpLv ? rb(ev.bpLv[0], ev.bpLv[1]) : '';
  var sm = scSum(ev); $('sc_sum').innerHTML = sm;
  $('sc_side').innerHTML = '<h3>สรุปผลทันที</h3>' + (p ? '<p class="sub" style="margin-bottom:8px">' + esc(p.name) + '</p>' : '') + sm;
}
async function scSave(andPrint) {
  var o = scObj();
  if (!o.patientId || !o.date) { toast('กรุณาเลือกผู้ป่วยและวันที่', 1); scShow(1); return; }
  var p = find(o.patientId), ev = scEval(o, p && p.gender);
  o.bmi = ev.bmi === null ? '' : ev.bmi; o.risk = ev.overall === 'none' ? '' : ev.overall; o.interview = JSON.stringify(o.interview);
  o = Object.assign({}, scEdit || {}, o);
  $('sv').disabled = true;
  try {
    var r = await call('saveScreen', o); await load(); toast('บันทึกผลคัดกรองแล้ว');
    if (andPrint) scPrint(r.id); else go('scr');
  } catch (e) { toast(e.message, 1); $('sv').disabled = false; }
}
function scCp() {
  var pid = $('sc_p').value; if (!pid) { toast('กรุณาเลือกผู้ป่วยก่อน (ขั้นตอนที่ 1)', 1); return; }
  var prev = scSorted(S.screens.filter(function (x) { return x.patientId === pid && (!scEdit || x.id !== scEdit.id); }))[0];
  if (!prev) { toast('ผู้ป่วยรายนี้ยังไม่เคยคัดกรอง', 1); return; }
  var iv = parseIv(prev.interview); $('scp_2').innerHTML = cpBtn() + scP2(iv); $('scp_3').innerHTML = scP3(iv); scUp(); toast('ลอกผลสัมภาษณ์จากวันที่ ' + fmtD(prev.date) + ' แล้ว');
}
function cpBtn() { return '<div class="ph2 np" style="justify-content:flex-end;margin-bottom:10px"><button type="button" class="sec sm" data-a="scCp">📋 ลอกผลสัมภาษณ์จากครั้งก่อน</button></div>'; }

/* ---------- รายการ / หน้าภาพรวม ---------- */
function rowS(s, name) {
  var p = find(s.patientId) || {}, ev = scEval(scNorm(s), p.gender);
  var d = [ev.bmi !== null ? 'BMI ' + ev.bmi.toFixed(1) : '', ev.sys ? 'BP ' + ev.sys + '/' + ev.dia : '', ev.su !== undefined ? 'น้ำตาล ' + ev.su : ''].filter(Boolean).join(' · ');
  return '<div class="li" data-a="scE" data-v="' + s.id + '"><div class="av">🩺</div><div class="x"><b>' + (name ? esc(p.name || 'ไม่พบผู้ป่วย') : fmtD(s.date)) + '</b><span class="sub">' +
    (name ? fmtD(s.date) + ' · ' : '') + esc(d || 'ไม่มีค่าที่วัด') + '</span></div>' + rb(s.risk || 'none') + '</div>';
}
function scSorted(a) { return a.slice().sort(function (x, y) { return y.date.localeCompare(x.date) || (y.time || '').localeCompare(x.time || '') || (y.createdAt || '').localeCompare(x.createdAt || ''); }); }
function vScr() {
  var last = {}, cnt = { green: 0, yellow: 0, red: 0 };
  scSorted(S.screens).forEach(function (s) { if (!last[s.patientId]) last[s.patientId] = s; });
  var ks = Object.keys(last); ks.forEach(function (k) { if (cnt[last[k].risk] !== undefined) cnt[last[k].risk]++; });
  var C = [['🩺', 'ผู้ป่วยที่คัดกรองแล้ว', ks.length], ['🔴', 'เสี่ยงสูง (ล่าสุด)', cnt.red], ['🟡', 'เฝ้าระวัง (ล่าสุด)', cnt.yellow], ['🟢', 'ปกติ (ล่าสุด)', cnt.green]];
  return '<div class="hd"><div><h2>คัดกรองเบาหวาน/ความดัน (' + S.screens.length + ')</h2><span class="sub">สัมภาษณ์ปัจจัยเสี่ยง วัดน้ำตาล ความดัน และ BMI</span></div><div class="ph2"><button class="sec" data-a="scPB">🖨️ แบบฟอร์มเปล่า</button><button data-a="scN">+ คัดกรอง</button></div></div>' +
    '<div class="gs">' + C.map(function (c) { return '<div class="cd st"><i>' + c[0] + '</i><b data-n="' + c[2] + '">0</b><span>' + c[1] + '</span></div>'; }).join('') + '</div>' +
    '<div class="cd lst">' + (scSorted(S.screens).map(function (s) { return rowS(s, true); }).join('') || '<div class="empty"><i>🩺</i>ยังไม่มีการคัดกรอง กด "+ คัดกรอง" เพื่อเริ่มต้น</div>') + '</div>';
}
function scMini(id) {
  var a = scSorted(S.screens.filter(function (x) { return x.patientId === id; }));
  return '<label class="t">ประวัติการคัดกรองเบาหวาน/ความดัน (' + a.length + ')</label>' + (a.slice(0, 5).map(function (s) { return rowS(s, false); }).join('') || '<div class="empty">ยังไม่เคยคัดกรอง</div>');
}

/* ---------- เอกสารพิมพ์ (แบบฟอร์มเต็ม ติ๊ก ☑/☐ เก็บเป็นหลักฐานได้) ---------- */
function ck(on, l) { return '<span class="ck">' + (on ? '☑' : '☐') + ' ' + l + '</span>'; }
function scSheet(p, s) {
  p = p || {}; s = s || {};
  var iv = parseIv(s.interview), ev = scEval(Object.assign({}, s, { interview: iv }), p.gender), bl = !s.id, DOT = '..........';
  var v = function (x, u) { return x ? esc(x) + (u ? ' ' + u : '') : DOT; };
  var tr = function (a, b) { return '<tr><td>' + a + '</td><td>' + b + '</td></tr>'; };
  var lv = function (a) { return a ? ' — ' + rb(a[0], a[1]) : ''; };
  var fam = function (a, o) { return FAM.map(function (x) { return ck(a.indexOf(x[0]) >= 0, x[1]); }).join('') + ck(!!o, 'อื่นๆ ' + (o ? esc(o) : DOT)); };
  var sm = iv.sm, al = iv.al;
  var ov = { green: 'ความเสี่ยงต่ำ', yellow: 'เฝ้าระวัง', red: 'เสี่ยงสูง ควรส่งพบแพทย์', none: '' }[ev.overall];
  var h = '<div class="sh"><b>โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านบัวหลวง</b><br>ตำบลเหล่า อำเภอทุ่งเขาหลวง จังหวัดร้อยเอ็ด<h2>แบบคัดกรองความเสี่ยงโรคเบาหวานและความดันโลหิตสูง</h2></div>' +
    '<table class="t4"><tr><td>ชื่อ-นามสกุล</td><td>' + (p.name ? esc(p.name) : DOT + DOT) + '</td><td>อายุ / เพศ</td><td>' + (p.name ? esc(p.age || '-') + ' ปี / ' + esc(p.gender || '-') : DOT) + '</td></tr>' +
    '<tr><td>วันที่คัดกรอง</td><td>' + (s.date ? fmtD(s.date) + (s.time ? ' เวลา ' + esc(s.time) + ' น.' : '') : DOT) + '</td><td>ผู้คัดกรอง</td><td>' + (s.screener ? esc(s.screener) : DOT) + '</td></tr>' +
    '<tr><td>ที่อยู่</td><td colspan="3">' + (p.address ? esc(p.address).replace(/\n/g, '<br>') : DOT + DOT + DOT) + '</td></tr></table>' +
    '<h4>ส่วนที่ 1 การวัดร่างกาย</h4><table class="t4"><tr><td>น้ำหนัก</td><td>' + v(s.weight, 'กก.') + '</td><td>ส่วนสูง</td><td>' + v(s.height, 'ซม.') + '</td></tr>' +
    '<tr><td>รอบเอว</td><td>' + v(s.waist, 'ซม.') + lv(ev.waLv) + '</td><td>BMI</td><td>' + (ev.bmi !== null ? ev.bmi.toFixed(1) + lv(ev.bmiLv) : DOT) + '</td></tr></table>' +
    '<h4>ส่วนที่ 2 ประวัติครอบครัวและการเจ็บป่วย</h4><table>' + tr('บิดา/มารดามีประวัติ', fam(iv.fm, iv.fmo)) + tr('พี่น้องสายตรงมีประวัติ', fam(iv.sb, iv.sbo)) + '</table>' +
    '<table>' + HX3.map(function (x) { var q = iv.hx[x[0]]; return tr(x[1], ck(q === 'Y', 'มี') + ck(q === 'N', 'ไม่มี') + ck(q === 'U', 'ไม่เคยตรวจ')); }).join('') +
    HX2.map(function (x) { var q = iv.sy[x[0]]; return tr(x[1], ck(q === 'Y', 'มี') + ck(q === 'N', 'ไม่มี')); }).join('') +
    tr('วิธีปฏิบัติตนหากมีประวัติ', TXQ.map(function (x) { return ck(iv.tx === x[0], x[1]); }).join('<br>')) + '</table>' +
    '<h4>ส่วนที่ 3 พฤติกรรมสุขภาพ</h4><table>' +
    tr('การสูบบุหรี่', ck(sm.st === 'no', 'ไม่สูบ') + ck(sm.st === 'yes', 'สูบ ' + v(sm.cig, 'มวน/วัน') + ' ' + v(sm.pk, 'pack/ปี') + ' ' + v(sm.yr, 'ปี')) + (sm.ty ? ' ชนิด ' + esc(sm.ty) : '') + '<br>' + ck(sm.qt === 'Y', 'เคยสูบแต่เลิกแล้ว ' + v(sm.qyr, 'ปี') + (sm.qty ? ' ชนิด ' + esc(sm.qty) : ''))) +
    tr('การดื่มแอลกอฮอล์', ALQ.map(function (x) { return ck(al.st === x[0], x[1]); }).join('') + '<br>ความถี่ ' + v(al.fq, 'ครั้ง/สัปดาห์') + ' · ชนิด ' + v(al.ty) + ' · ระยะเวลา ' + v(al.yr, 'ปี')) +
    tr('การออกกำลังกาย', EXQ.map(function (t, i) { return ck(iv.ex === String(i + 1), t); }).join('<br>')) +
    tr('รสอาหารที่ชอบ', FDQ.map(function (x) { return ck(iv.fd.indexOf(x[0]) >= 0, x[1]); }).join('')) + '</table>' +
    '<h4>ส่วนที่ 4 ผลการตรวจ</h4><table>' +
    tr('น้ำตาลในเลือด', ck(s.sugarType !== 'RBS' && !bl, 'งดอาหาร (FPG)') + ck(s.sugarType === 'RBS', 'ไม่งดอาหาร') + ' ค่า ' + v(s.sugar, 'mg/dL') + lv(ev.suLv)) +
    tr('ความดันโลหิต', 'ครั้งที่ 1: ' + v(s.sbp1) + ' / ' + v(s.dbp1) + ' · ครั้งที่ 2: ' + v(s.sbp2) + ' / ' + v(s.dbp2) + ' mmHg' + (ev.bpLv ? '<br>ค่าเฉลี่ย ' + ev.sys + '/' + ev.dia + lv(ev.bpLv) : '')) +
    tr('ชีพจร', v(s.pulse, 'ครั้ง/นาที')) + '</table>' +
    '<h4>ส่วนที่ 5 สรุปผลและคำแนะนำ</h4><table>' + tr('สรุปผลคัดกรอง', ov ? rb(ev.overall, ov) : ck(false, 'ความเสี่ยงต่ำ') + ck(false, 'เฝ้าระวัง') + ck(false, 'เสี่ยงสูง ส่งพบแพทย์')) +
    tr('ปัจจัยเสี่ยง', esc(ev.f.join(', ')) || (bl ? DOT + DOT + DOT : '-')) + tr('บันทึก/คำแนะนำ', s.note ? esc(s.note).replace(/\n/g, '<br>') : (bl ? DOT + DOT + DOT + '<br><br>' : '-')) + '</table>' +
    '<div class="sg"><div>ลงชื่อ ........................................<br>ผู้คัดกรอง<br>(........................................)</div><div>ลงชื่อ ........................................<br>ผู้ตรวจสอบ<br>(........................................)</div></div>' +
    '<p style="text-align:right;font-size:12px;margin-top:10px">พิมพ์เมื่อ ' + fmtD(today()) + ' · ผลคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัย</p>';
  return h;
}
function scShowSheet(h) {
  go('prt');
  $('sheetw').innerHTML = '<div class="np ph2" style="justify-content:space-between;align-items:center;margin:14px 0"><span class="sub">✏️ คลิกที่เอกสารเพื่อแก้ไขข้อความได้ก่อนพิมพ์</span><button data-a="prn">🖨️ พิมพ์ / บันทึกเป็น PDF</button></div>' +
    '<div id="sheet" contenteditable="true" spellcheck="false">' + h + '</div>';
  $('sheetw').scrollIntoView({ behavior: 'smooth' });
}
function scPrint(id) {
  var s = S.screens.filter(function (x) { return x.id === id; })[0]; if (!s) return;
  var p = find(s.patientId); if (!p) return;
  P.pid = p.id; P.sel = null; closeModal(); scShowSheet(scSheet(p, s));
}

/* ---------- เชื่อมเข้ากับแอป ---------- */
Object.assign(A, {
  scN: function (id) { scForm(id || '', ''); }, scE: function (id) { scForm('', id); },
  scS: function () { scSave(false); }, scSP: function () { scSave(true); }, scCp: scCp, scP: scPrint,
  scPB: function () { scShowSheet(scSheet(null, null)); },
  scG: scGo, scNx: function () { scGo(scStep + 1); }, scB: function () { scGo(scStep - 1); },
  scQ: function () { go('scr'); },
  scD: function (id) {
    ask('ลบผลคัดกรองนี้?', async function () {
      try { await call('deleteScreen', { id: id }); await load(); closeModal(); go('scr'); toast('ลบผลคัดกรองแล้ว'); } catch (e) { toast(e.message, 1); closeModal(); }
    });
  },
  scRst: function () { document.querySelectorAll('#scp_2 input[type=radio]:checked').forEach(function (e) { e.checked = false; }); scUp(); },
  scAllN: function () {
    HX3.map(function (x) { return 'hx_' + x[0]; }).concat(HX2.map(function (x) { return 'sy_' + x[0]; })).forEach(function (n) {
      if (!document.querySelector('#scf input[name=' + n + ']:checked')) document.querySelector('#scf input[name=' + n + '][value=N]').checked = true;
    });
    scUp(); toast('ตอบ "ไม่มี" ในข้อที่ยังว่างแล้ว');
  }
});
function scEvt(e) {
  var t = e.target; if (!t.closest || !t.closest('#scf')) return;
  if (e.type === 'input' && (t.id === 'sc_smc' || t.id === 'sc_smy')) {
    var c = nz($('sc_smc').value), y = nz($('sc_smy').value);
    if (c !== null && y !== null) $('sc_smp').value = +(c / 20 * y).toFixed(1);
  }
  if (e.type === 'change' && t.type === 'checkbox' && t.checked) {
    var ex = { fd: 'none', fm: 'UK', sb: 'UK' }[t.name];
    if (ex) document.querySelectorAll('#scf input[name=' + t.name + ']').forEach(function (o) { if (t.value === ex ? o !== t : o.value === ex) o.checked = false; });
  }
  scUp();
}
document.addEventListener('input', scEvt);
document.addEventListener('change', scEvt);
