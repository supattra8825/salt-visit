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
var SCT = [['fm', '👪 ครอบครัว'], ['hx', '🩺 ประวัติป่วย'], ['sm', '🚬 บุหรี่'], ['al', '🍺 แอลกอฮอล์'], ['ex', '🏃 ออกกำลังกาย'], ['fd', '🍽️ อาหาร'], ['su', '🩸 น้ำตาล'], ['bp', '❤️ ความดัน']];
var scEdit = null, scTab = 'fm';

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
function hd(t) { return '<label class="t" style="font-size:15px;color:var(--tx)">' + t + '</label>'; }
function chk(n, v, l, on) { return '<label class="ch"><input type="checkbox" name="' + n + '" value="' + v + '"' + (on ? ' checked' : '') + '><span>' + l + '</span></label>'; }
function rad(n, v, l, on) { return '<label class="ch"><input type="radio" name="' + n + '" value="' + v + '"' + (on ? ' checked' : '') + '><span>' + l + '</span></label>'; }
function qrow(l, chips) { return '<div class="qr" style="flex-wrap:wrap;justify-content:space-between;border-bottom:1px solid var(--ln)"><span style="flex:1;min-width:210px">' + l + '</span><span>' + chips + '</span></div>'; }
function scInt(iv) {
  var sm = iv.sm, al = iv.al;
  var fam = function (n, a) { return FAM.map(function (x) { return chk(n, x[0], x[1], a.indexOf(x[0]) >= 0); }).join(''); };
  var s = '<div class="scs" id="scs_fm">' + hd('บิดาหรือมารดาของท่านมีประวัติเจ็บป่วยด้วย') + fam('fm', iv.fm) + fld('sc_fmo', 'อื่นๆ', iv.fmo) +
    '<div style="height:10px"></div>' + hd('พี่น้อง (สายตรง) ของท่านมีประวัติเจ็บป่วยด้วย') + fam('sb', iv.sb) + fld('sc_sbo', 'อื่นๆ', iv.sbo) + '</div>';
  s += '<div class="scs hide" id="scs_hx">' + hd('ท่านมีประวัติเจ็บป่วย หรือต้องพบแพทย์ด้วยโรคหรืออาการ') +
    HX3.map(function (x) { var v = iv.hx[x[0]], n = 'hx_' + x[0]; return qrow(x[1], rad(n, 'Y', 'มี', v === 'Y') + rad(n, 'N', 'ไม่มี', v === 'N') + rad(n, 'U', 'ไม่เคยตรวจ', v === 'U')); }).join('') +
    HX2.map(function (x) { var v = iv.sy[x[0]], n = 'sy_' + x[0]; return qrow(x[1], rad(n, 'Y', 'มี', v === 'Y') + rad(n, 'N', 'ไม่มี', v === 'N')); }).join('') +
    '<div style="height:10px"></div>' + hd('วิธีการปฏิบัติตนหากมีประวัติด้านบน') + TXQ.map(function (x) { return rad('tx', x[0], x[1], iv.tx === x[0]); }).join('') +
    '<div class="row" style="justify-content:flex-start"><button type="button" class="sec sm" data-a="scRst">↺ ล้างคำตอบหน้านี้</button></div></div>';
  s += '<div class="scs hide" id="scs_sm">' + hd('ท่านสูบบุหรี่หรือไม่') + rad('sms', 'no', 'ไม่สูบ', sm.st === 'no') + rad('sms', 'yes', 'สูบ', sm.st === 'yes') +
    '<div class="g2">' + fld('sc_smc', 'จำนวน (มวน/วัน)', sm.cig, 'number', 'min="0" inputmode="numeric"') + fld('sc_smy', 'ระยะเวลา (ปี) ตั้งแต่เริ่มสูบจนถึงปัจจุบัน', sm.yr, 'number', 'min="0"') + '</div>' +
    '<div class="g2">' + fld('sc_smp', 'จำนวน (Pack/ปี)', sm.pk, 'number', 'step="0.1" min="0"') + fld('sc_smt', 'ชนิดของบุหรี่', sm.ty) + '</div>' +
    '<label class="qr" style="margin-top:10px"><input type="checkbox" id="sc_smq"' + (sm.qt === 'Y' ? ' checked' : '') + '>เคยสูบแต่เลิกแล้ว</label>' +
    '<div class="g2">' + fld('sc_smqt', 'ชนิดของบุหรี่ที่เคยสูบ', sm.qty) + fld('sc_smqy', 'ระยะเวลา (ปี) ตั้งแต่เริ่มสูบจนหยุดสูบ', sm.qyr, 'number', 'min="0"') + '</div></div>';
  s += '<div class="scs hide" id="scs_al">' + hd('ท่านดื่มแอลกอฮอล์หรือไม่') + ALQ.map(function (x) { return rad('als', x[0], x[1], al.st === x[0]); }).join('') +
    '<div class="g2">' + fld('sc_alf', 'ความถี่ (ครั้ง/สัปดาห์)', al.fq, 'number', 'min="0" max="7"') + fld('sc_alt', 'ชนิดเครื่องดื่ม', al.ty) + '</div>' + fld('sc_aly', 'ระยะเวลาที่ดื่ม (ปี)', al.yr, 'number', 'min="0"') + '</div>';
  s += '<div class="scs hide" id="scs_ex">' + hd('การออกกำลังกาย') + EXQ.map(function (t, i) { return '<div>' + rad('ex', String(i + 1), t, iv.ex === String(i + 1)) + '</div>'; }).join('') + '</div>';
  s += '<div class="scs hide" id="scs_fd">' + hd('ท่านชอบอาหารรสใด') + FDQ.map(function (x) { return chk('fd', x[0], x[1], iv.fd.indexOf(x[0]) >= 0); }).join('') + '</div>';
  return s;
}

function scForm(pid, sid) {
  if (!S.patients.length) { toast('กรุณาเพิ่มผู้ป่วยก่อนคัดกรอง', 1); return; }
  var s = S.screens.filter(function (x) { return x.id === sid; })[0] || {}; scEdit = s.id ? s : null; scTab = 'fm';
  var sel = pid || s.patientId || '', iv = parseIv(s.interview);
  var ops = '<option value="">- เลือกผู้ป่วย -</option>' + S.patients.map(function (p) { return '<option value="' + p.id + '"' + (p.id === sel ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('');
  var nm = 'step="0.1" min="0" inputmode="decimal"';
  var pills = SCT.map(function (t) { return '<a class="pl' + (t[0] === 'fm' ? ' on' : '') + '" data-a="scT" data-v="' + t[0] + '">' + t[1] + '</a>'; }).join('');
  openModal('<div id="scf"><h3>' + (s.id ? 'แก้ไขผลคัดกรอง' : 'คัดกรองความเสี่ยงเบาหวานและความดัน') + '</h3>' +
    '<label class="t" for="sc_p">ผู้ป่วย *</label><select id="sc_p">' + ops + '</select>' +
    '<div class="g2">' + fld('sc_d', 'วันที่ *', s.date || today(), 'date') + fld('sc_t', 'เวลา', s.time || nowT(), 'time') + '</div>' +
    '<div class="g2">' + fld('sc_w', 'น้ำหนัก (กก.)', s.weight, 'number', nm) + fld('sc_h', 'ส่วนสูง (ซม.)', s.height, 'number', nm) + '</div>' +
    '<div class="g2">' + fld('sc_o', 'รอบเอว (ซม.)', s.waist, 'number', nm) + fld('sc_b', 'BMI (คำนวณอัตโนมัติ)', s.bmi, 'text', 'readonly') + '</div>' +
    '<div class="cd" id="sc_sum" style="margin-top:14px;padding:12px"></div>' +
    '<p class="sub" style="margin:6px 0 10px;text-align:center">ผลคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัย ผู้ที่ค่าผิดปกติควรได้รับการยืนยันโดยแพทย์</p>' +
    '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px"><b>การสัมภาษณ์และการวัดค่า</b><button type="button" class="sec sm" data-a="scCp">📋 ลอกผลสัมภาษณ์จากครั้งก่อน</button></div>' +
    '<div style="margin:8px 0">' + pills + '</div>' +
    '<div id="sc_int">' + scInt(iv) + '</div>' +
    '<div class="scs hide" id="scs_su">' + hd('ระดับน้ำตาลในเลือด') + '<label class="t" for="sc_gt">ประเภทการตรวจ</label><select id="sc_gt"><option value="FBS"' + (s.sugarType !== 'RBS' ? ' selected' : '') + '>งดอาหารอย่างน้อย 8 ชั่วโมง (FPG)</option><option value="RBS"' + (s.sugarType === 'RBS' ? ' selected' : '') + '>ไม่ได้งดอาหาร (สุ่มตรวจ)</option></select>' +
    fld('sc_g', 'ค่าน้ำตาลในเลือด (mg/dL)', s.sugar, 'number', 'min="0" inputmode="decimal"') +
    '<p class="sub" style="margin-top:8px">งดอาหาร: ปกติ &lt; 100 · เสี่ยง 100–125 · สูง ≥ 126<br>ไม่งดอาหาร: ปกติ &lt; 140 · เฝ้าระวัง 140–199 · สูง ≥ 200</p></div>' +
    '<div class="scs hide" id="scs_bp">' + hd('การวัดความดันโลหิต (mmHg)') + '<div class="g2">' + fld('sc_s1', 'ครั้งที่ 1 ตัวบน (SYS)', s.sbp1, 'number', 'min="0" inputmode="numeric"') + fld('sc_d1', 'ครั้งที่ 1 ตัวล่าง (DIA)', s.dbp1, 'number', 'min="0" inputmode="numeric"') +
    fld('sc_s2', 'ครั้งที่ 2 ตัวบน (ถ้ามี)', s.sbp2, 'number', 'min="0" inputmode="numeric"') + fld('sc_d2', 'ครั้งที่ 2 ตัวล่าง (ถ้ามี)', s.dbp2, 'number', 'min="0" inputmode="numeric"') + '</div>' +
    fld('sc_hr', 'ชีพจร (ครั้ง/นาที)', s.pulse, 'number', 'min="0" inputmode="numeric"') +
    '<p class="sub" style="margin-top:8px">ปกติ &lt; 120/80 · เฝ้าระวัง 120–139 / 80–89 · สูง ≥ 140/90 (ใช้ค่าเฉลี่ยของครั้งที่วัด)</p></div>' +
    '<label class="t" for="sc_n">บันทึก/คำแนะนำที่ให้</label><textarea id="sc_n">' + esc(s.note) + '</textarea>' +
    '<div class="row">' + (s.id ? '<button class="dg" data-a="scD" data-v="' + s.id + '">ลบ</button><button class="sec" data-a="scP" data-v="' + s.id + '">🖨️ พิมพ์</button>' : '') + '<button class="sec" data-a="close">ยกเลิก</button><button id="sv" data-a="scS">บันทึกผลคัดกรอง</button></div></div>');
  scUp();
}
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
  $('sc_b').value = ev.bmi === null ? '' : ev.bmi.toFixed(1); $('sc_sum').innerHTML = scSum(ev);
}
async function scSave() {
  var o = scObj();
  if (!o.patientId || !o.date) { toast('กรุณาเลือกผู้ป่วยและวันที่', 1); return; }
  var p = find(o.patientId), ev = scEval(o, p && p.gender);
  o.bmi = ev.bmi === null ? '' : ev.bmi; o.risk = ev.overall === 'none' ? '' : ev.overall; o.interview = JSON.stringify(o.interview);
  o = Object.assign({}, scEdit || {}, o);
  $('sv').disabled = true;
  try { await call('saveScreen', o); await load(); closeModal(); render(); toast('บันทึกผลคัดกรองแล้ว'); }
  catch (e) { toast(e.message, 1); $('sv').disabled = false; }
}
function scCp() {
  var pid = $('sc_p').value; if (!pid) { toast('กรุณาเลือกผู้ป่วยก่อน', 1); return; }
  var prev = S.screens.filter(function (x) { return x.patientId === pid && (!scEdit || x.id !== scEdit.id); })
    .sort(function (a, b) { return b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''); })[0];
  if (!prev) { toast('ผู้ป่วยรายนี้ยังไม่เคยคัดกรอง', 1); return; }
  $('sc_int').innerHTML = scInt(parseIv(prev.interview)); A.scT(scTab); scUp(); toast('ลอกผลสัมภาษณ์จากวันที่ ' + fmtD(prev.date) + ' แล้ว');
}

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
  return '<div class="hd"><div><h2>คัดกรองเบาหวาน/ความดัน (' + S.screens.length + ')</h2><span class="sub">สัมภาษณ์ปัจจัยเสี่ยง วัดน้ำตาล ความดัน และ BMI</span></div><button data-a="scN">+ คัดกรอง</button></div>' +
    '<div class="gs">' + C.map(function (c) { return '<div class="cd st"><i>' + c[0] + '</i><b data-n="' + c[2] + '">0</b><span>' + c[1] + '</span></div>'; }).join('') + '</div>' +
    '<div class="cd lst">' + (scSorted(S.screens).map(function (s) { return rowS(s, true); }).join('') || '<div class="empty"><i>🩺</i>ยังไม่มีการคัดกรอง กด "+ คัดกรอง" เพื่อเริ่มต้น</div>') + '</div>';
}
function scMini(id) {
  var a = scSorted(S.screens.filter(function (x) { return x.patientId === id; }));
  return '<label class="t">ประวัติการคัดกรองเบาหวาน/ความดัน (' + a.length + ')</label>' + (a.slice(0, 5).map(function (s) { return rowS(s, false); }).join('') || '<div class="empty">ยังไม่เคยคัดกรอง</div>');
}

/* ---------- พิมพ์ ---------- */
function scIvRows(iv) {
  var fam = function (a, o) { var t = (a || []).map(function (k) { return labOf(FAM, k); }); if (o) t.push(o); return t.join(', ') || '-'; };
  var ys = function (l, m) { return l.filter(function (x) { return m[x[0]] === 'Y'; }).map(function (x) { return x[1]; }).join(', ') || '-'; };
  var sm = iv.sm, al = iv.al;
  var smT = sm.st === 'yes' ? 'สูบ ' + (sm.cig || '-') + ' มวน/วัน · ' + (sm.pk || '-') + ' pack/ปี · ' + (sm.yr || '-') + ' ปี' + (sm.ty ? ' · ' + sm.ty : '') : (sm.st === 'no' ? 'ไม่สูบ' : '-');
  if (sm.qt === 'Y') smT += ' · เคยสูบแต่เลิกแล้ว' + (sm.qyr ? ' (' + sm.qyr + ' ปี)' : '') + (sm.qty ? ' ' + sm.qty : '');
  var alT = labOf(ALQ, al.st); if (alT === al.st) alT = '-';
  if (al.st === 'oc' || al.st === 'rg' || al.st === 'qt') alT += (al.fq ? ' · ' + al.fq + ' ครั้ง/สัปดาห์' : '') + (al.ty ? ' · ' + al.ty : '') + (al.yr ? ' · ' + al.yr + ' ปี' : '');
  return [['บิดา/มารดามีประวัติ', fam(iv.fm, iv.fmo)], ['พี่น้องสายตรงมีประวัติ', fam(iv.sb, iv.sbo)], ['ประวัติเจ็บป่วย (มี)', ys(HX3, iv.hx)],
    ['ไม่เคยตรวจ', HX3.filter(function (x) { return iv.hx[x[0]] === 'U'; }).map(function (x) { return x[1]; }).join(', ') || '-'], ['อาการที่พบ', ys(HX2, iv.sy)],
    ['การปฏิบัติตน', labOf(TXQ, iv.tx) === iv.tx ? '-' : labOf(TXQ, iv.tx)], ['การสูบบุหรี่', smT], ['การดื่มแอลกอฮอล์', alT], ['การออกกำลังกาย', EXQ[iv.ex - 1] || '-'],
    ['รสอาหารที่ชอบ', (iv.fd || []).map(function (k) { return labOf(FDQ, k); }).join(', ') || '-']];
}
function scPrint(id) {
  var s = S.screens.filter(function (x) { return x.id === id; })[0]; if (!s) return;
  var p = find(s.patientId); if (!p) return;
  var n = scNorm(s), ev = scEval(n, p.gender), tr = function (a, b) { return '<tr><td>' + a + '</td><td>' + b + '</td></tr>'; };
  var ov = { green: 'ความเสี่ยงต่ำ', yellow: 'เฝ้าระวัง', red: 'เสี่ยงสูง ควรส่งพบแพทย์', none: '-' }[ev.overall];
  var h = '<div class="sh"><b>โรงพยาบาลส่งเสริมสุขภาพตำบลบ้านบัวหลวง</b><br>ตำบลเหล่า อำเภอทุ่งเขาหลวง จังหวัดร้อยเอ็ด<h2>แบบคัดกรองความเสี่ยงโรคเบาหวานและความดันโลหิตสูง</h2></div>' +
    '<h4>ข้อมูลผู้ป่วย</h4><table>' + tr('ชื่อ-นามสกุล', esc(p.name)) + tr('อายุ / เพศ', esc(p.age || '-') + ' ปี / ' + esc(p.gender || '-')) + tr('ที่อยู่', esc(p.address || '-').replace(/\n/g, '<br>')) + '</table>' +
    '<h4>ผลการวัด วันที่ ' + fmtD(s.date) + (s.time ? ' เวลา ' + esc(s.time) + ' น.' : '') + '</h4><table>' +
    tr('น้ำหนัก / ส่วนสูง', esc(s.weight || '-') + ' กก. / ' + esc(s.height || '-') + ' ซม.') + tr('BMI', ev.bmi !== null ? ev.bmi.toFixed(1) + ' — ' + rb(ev.bmiLv[0], ev.bmiLv[1]) : '-') +
    tr('รอบเอว', esc(s.waist || '-') + ' ซม.' + (ev.waLv ? ' — ' + rb(ev.waLv[0], ev.waLv[1]) : '')) +
    tr('น้ำตาลในเลือด', ev.suLv ? ev.su + ' mg/dL (' + (s.sugarType === 'RBS' ? 'ไม่งดอาหาร' : 'งดอาหาร') + ') — ' + rb(ev.suLv[0], ev.suLv[1]) : '-') +
    tr('ความดันโลหิต', ev.bpLv ? ev.sys + '/' + ev.dia + ' mmHg — ' + rb(ev.bpLv[0], ev.bpLv[1]) : '-') + tr('ชีพจร', esc(s.pulse || '-') + ' ครั้ง/นาที') +
    tr('สรุปผลคัดกรอง', rb(ev.overall, ov)) + tr('ปัจจัยเสี่ยง', esc(ev.f.join(', ') || '-')) + '</table>' +
    '<h4>ผลการสัมภาษณ์</h4><table>' + scIvRows(n.interview).map(function (r) { return tr(r[0], esc(r[1])); }).join('') + '</table>' +
    '<h4>บันทึก/คำแนะนำ</h4><div>' + esc(s.note || '-').replace(/\n/g, '<br>') + '</div>' +
    '<div class="sg"><div>ลงชื่อ ........................................<br>ผู้คัดกรอง (' + esc(s.screener || '........................') + ')</div><div>ลงชื่อ ........................................<br>ผู้ตรวจสอบ<br>(........................................)</div></div>' +
    '<p style="text-align:right;font-size:13px;margin-top:14px">พิมพ์เมื่อ ' + fmtD(today()) + ' · ผลคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัย</p>';
  P.pid = p.id; P.sel = null; closeModal(); go('prt');
  $('sheetw').innerHTML = '<div class="np ph2" style="justify-content:space-between;align-items:center;margin:14px 0"><span class="sub">✏️ คลิกที่เอกสารเพื่อแก้ไขข้อความได้ก่อนพิมพ์</span><button data-a="prn">🖨️ พิมพ์ / บันทึกเป็น PDF</button></div>' +
    '<div id="sheet" contenteditable="true" spellcheck="false">' + h + '</div>';
  $('sheetw').scrollIntoView({ behavior: 'smooth' });
}

/* ---------- เชื่อมเข้ากับแอป ---------- */
Object.assign(A, {
  scN: function (id) { scForm(id || '', ''); }, scE: function (id) { scForm('', id); }, scS: scSave, scCp: scCp, scP: scPrint,
  scD: function (id) { ask('ลบผลคัดกรองนี้?', function () { del('deleteScreen', id, 'ลบผลคัดกรองแล้ว'); }); },
  scT: function (id) {
    scTab = id;
    document.querySelectorAll('#scf .scs').forEach(function (e) { e.classList.toggle('hide', e.id !== 'scs_' + id); });
    document.querySelectorAll('#scf .pl').forEach(function (e) { e.classList.toggle('on', e.dataset.v === id); });
  },
  scRst: function () { document.querySelectorAll('#scs_hx input:checked').forEach(function (e) { e.checked = false; }); scUp(); }
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
