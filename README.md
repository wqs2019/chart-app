# react-native-cli 模板

这是从 `maoqiu-diary-app` 抽离出的最小可复用脚手架，保留了：

- Expo + React Native + TypeScript 基础工程
- React Navigation 导航骨架
- Zustand 全局状态管理
- TCB 云开发基础配置与云函数调用封装
- `user` 云函数 demo 的前后端闭环
- 一个 `HomeScreen` 和一个 `UserDemoScreen`

## 目录结构

```text
react-native-cli
├── App.tsx
├── cloudfunctions/
│   └── user/
└── src/
    ├── config/
    ├── hooks/
    ├── navigation/
    ├── screens/
    ├── services/
    ├── store/
    ├── types/
    └── utils/
```

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 配置 TCB 环境

编辑 `src/config/constant.ts`：

```ts
export const TCB_CONFIG = {
  env: '你的云开发环境 ID',
  region: 'ap-shanghai',
};
```

3. 部署云函数

先部署 `cloudfunctions/user`，并在云开发中创建 `users` 集合。

4. 启动项目

```bash
npm run start
```

## user demo 说明

`UserDemoScreen` 保留了最小的 CRUD 示例：

- 创建 demo 用户
- 根据 ID 查询用户
- 更新昵称
- 获取用户列表
- 删除用户

## 云函数接口约定

前端统一通过 `src/services/tcb.ts` 调用：

```ts
CloudService.callFunction('user', {
  action: 'list',
  data: {},
});
```

`user` 云函数默认提供：

- `add`
- `get`
- `list`
- `update`
- `delete`
