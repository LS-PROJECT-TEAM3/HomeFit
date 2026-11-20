// spec 021 FR-003: 웹 푸시 서비스 워커. 서버가 보낸 알림(제목·본문·여는 주소)을 띄우고, 누르면 그 화면을 연다
// 알림 내용은 서버(incident/web-push.ts)가 슬랙 글과 같게 만든다. 여기서는 받은 값만 쓴다

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "[HomeFit] 새 알림", body: event.data ? event.data.text() : "" };
  }
  const title = typeof data.title === "string" && data.title ? data.title : "[HomeFit] 새 알림";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === "string" ? data.body : "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: typeof data.url === "string" ? data.url : "/" },
    }),
  );
});

// 같은 앱 주소만 연다(다른 사이트로 보내는 주소는 홈으로)
function safeUrl(raw) {
  try {
    const url = new URL(raw, self.location.origin);
    return url.origin === self.location.origin ? url.href : self.location.origin + "/";
  } catch {
    return self.location.origin + "/";
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = safeUrl(event.notification.data && event.notification.data.url);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url === target);
      if (open) return open.focus();
      return self.clients.openWindow(target);
    }),
  );
});
