[OPEN] follow-tab-badge

# Debug Session

- Symptom: A 关注 B 后，B 停留在【首页】时，底部【我的】Tab 没有直接出现红点。
- Expected: B 不切到【我的】页面，只要通知到达或应用回到前台，底部【我的】Tab 也应展示红点。

# Hypotheses

1. 前台收到推送时，`useNotificationBootstrap` 没有触发未读刷新。
2. 关注成功后云端只写了 `chart_follows`，没有成功写入 `chart_notifications`，导致总未读数没有变化。
3. Expo 推送到达了，但前台监听没有执行，或执行时 `currentUser`/store 闭包拿到的是旧值。
4. 底部 `我的` Tab 红点绑定的是 `unreadNotificationCount`，但这个状态没有在首页常驻组件里触发重渲染。
5. B 账号没有有效 `push_token`，前台停留首页时没有任何触发源，所以只有切到【我的】后通过 `focus` 拉取才出现红点。

# Plan

1. 给前台通知接收、AppState 切回前台、未读拉取、Tab 红点渲染加调试埋点。
2. 复现 A 关注 B，收集运行时证据。
3. 根据日志确认是“没写通知 / 没收到推送 / 收到但没刷新 / 刷新了但没渲染”中的哪一类。
4. 再做最小修复并二次验证。
