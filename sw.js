/* Service worker: เก็บไฟล์หน้าเว็บไว้ให้เปิดเร็วและติดตั้งเป็นแอปได้ (ข้อมูลผู้ป่วยไม่ถูกเก็บไว้ที่นี่) */
var CACHE = 'salt-v2';
var SHELL = ['./', 'index.html', 'style.css', 'app.js', 'screen.js', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  var sameOrigin = u.origin === location.origin, font = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!sameOrigin && !font) return;
  e.respondWith(
    fetch(r).then(function (res) {
      if (res && res.status === 200) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, cp); }); }
      return res;
    }).catch(function () { return caches.match(r).then(function (m) { return m || caches.match('index.html'); }); })
  );
});
