# src 目录结构说明

本文件是 4Chat 前端 `src/` 目录的"地图"，帮助你快速理解每个目录和文件的作用。

## 一、总览：src 下的各大类目

```
src/
├── api/          # 接口层：所有 HTTP 请求的封装（唯一直接调用 axios 的地方）
├── components/   # 组件层：可复用的 UI 组件
├── composables/  # 组合式函数层：无 UI 的可复用逻辑（Vue 3 的 hooks）
├── router/       # 路由层：URL 与页面的映射
├── stores/       # 状态管理层：Pinia 全局共享数据
├── types/        # 类型层：TS 类型定义（跨模块共享）
├── views/        # 视图层：页面级组件（一个文件 = 一个页面）
├── assets/       # 静态资源（图片等）
├── App.vue       # 根组件
├── main.ts       # 应用入口
└── style.css     # 全局基础样式
```

**各层之间的调用方向（单向依赖，帮你理清思路）：**

```
views（页面）  →  components（组件）  →  stores（状态）  →  api（接口）  →  后端
     ↓                                                        ↑
     └────────────  composables（工具逻辑）←──────────────────┘
```

- 页面负责"拼装"：放什么组件、开什么弹窗
- 组件负责"展示"：渲染数据、响应用户操作
- stores 负责"存数据"：跨组件共享的状态都放这里
- api 负责"和后端说话"：发请求、收响应
- composables 是"工具箱"：toast 提示、浏览器通知、头像工具等，谁都能用

---

## 二、api/ —— 接口层

> 所有和后端通信的代码都在这，页面/store **不应该**直接出现 axios 或 fetch 调用。

| 文件 | 作用 |
|---|---|
| `http.ts` | **axios 实例**。所有请求的公共配置：`baseURL` 取 `.env` 的 `VITE_API_BASE_URL`（空则走相对路径）；请求拦截器自动附加 JWT token；响应拦截器收到 401 时清空登录态并跳转登录页 |
| `auth.ts` | **登录/注册接口**：`/api/auth/login`、`/api/auth/register`，返回 token 与用户信息 |
| `chat/message.ts` | **消息 + 公告接口**：发送消息、分页拉取历史消息、公告列表、发布公告 |
| `chat/online.ts` | **在线用户接口**：获取在线用户列表、发送心跳、页面关闭时通知后端离线（用 `fetch + keepalive`，保证关页也能发出） |
| `user/profile.ts` | **个人中心接口**：获取/更新个人资料、更新心情状态、上传头像 |

---

## 三、components/ —— 组件层

> 可复用的 UI 部件。按业务分成 `chat/`（聊天相关）和 `user/`（用户相关）两个子目录。

| 文件 | 作用 |
|---|---|
| `AppSidebar.vue` | **左侧导航栏**：品牌 Logo、导航图标、底部"个人中心"头像入口（头像实时联动个人资料） |
| `AppToast.vue` | **全局轻提示**：顶部居中的小气泡，通过 `composables/toast.ts` 触发 |
| `InfoPanel.vue` | **通用信息面板**：标题 + 彩色小圆点 + 内容插槽，被"在线用户""公告""媒体库"三个面板复用 |
| `chat/ChatComposer.vue` | **聊天输入框**：文本输入、Enter 发送（带节流）、📢 打开发布公告弹窗 |
| `chat/CreateAnnounceDialog.vue` | **发布公告弹窗**：可拖拽的对话框，表单校验后调 store 创建公告 |
| `chat/OnlineUsers.vue` | **在线用户列表**：展示头像（无头像时显示哈希取色的占位符）、用户名、在线状态点、断线警告 |
| `user/AvatarCropper.vue` | **头像裁剪弹窗**：基于 cropperjs，方形裁剪后输出裁剪后的 Blob 供上传 |
| `user/ProfileEditDrawer.vue` | **个人资料编辑抽屉**：右侧滑出的编辑面板，支持"资料"和"心情状态"两种模式（含预设心情文案） |

---

## 四、composables/ —— 组合式函数

> 无 UI 的可复用逻辑。模块级状态（模块内共享）而非组件级。

| 文件 | 作用 |
|---|---|
| `toast.ts` | toast 提示状态与触发器：`showToast(text)` 弹出提示，`useToast()` 供 AppToast 订阅 |
| `notification.ts` | **新消息提醒**：浏览器系统通知 + 标签页标题未读数；页面可见时静默、隐藏时弹系统通知、点击通知跳转聊天页 |
| `avatar.ts` | **头像工具**：`resolveAvatarUrl` 把后端的 `/uploads/...` 相对路径拼成完整 URL；`avatarHue` 按用户 id 哈希生成稳定色相（占位符背景色） |

---

## 五、router/ —— 路由层

> 按业务拆成模块文件，最后在 `index.ts` 汇总。

| 文件 | 作用 |
|---|---|
| `index.ts` | **路由入口**：合并所有路由模块；全局守卫（未登录访问需登录页 → 跳 `/login`；已登录访问登录页 → 跳 `/chat`） |
| `modules/auth.ts` | 登录页路由 `/login`（仅未登录可访问） |
| `modules/chat.ts` | 聊天模块：`/` 挂 HomeView 外壳（带侧边栏），子路由 `/chat` 是聊天页 |
| `modules/user.ts` | 个人中心路由：`/profile` 同样挂 HomeView 外壳下 |

> 每个路由都带 `meta.feature` 标记（`auth` / `shell` / `chat` / `user`），用于标识路由所属功能。

---

## 六、stores/ —— 状态管理层（Pinia）

> 全局共享数据。同样按业务拆 `chat/` 子目录。规则：组件要读写"跨页面共享"的数据，必须通过 store，不直接改。

| 文件 | 作用 |
|---|---|
| `auth.ts` | **认证状态**：token 与用户信息（持久化到 localStorage）、登录/注册/登出、JWT 解析出用户 id |
| `user.ts` | **个人中心状态**：个人资料、头像上传、资料保存（保存成功后同步更新本地 profile） |
| `chat/message.ts` | **消息状态**：消息列表、乐观发送（先上屏再确认）、失败重试、历史消息滚动加载、SSE 实时消息流（EventSource） |
| `chat/announce.ts` | **公告状态**：公告列表、分页、加载/创建公告 |
| `chat/online.ts` | **在线状态**：在线用户轮询、心跳保活（15s/20s）、连续 3 次心跳失败判定"断线"、401 自动登出 |

---

## 七、types/ —— 类型定义

| 文件 | 作用 |
|---|---|
| `user.ts` | 个人中心相关 TS 类型：`UserProfile`（资料结构）、`UpdateProfileDTO`、`UpdateStatusDTO` |

> 各 api 文件内部的接口类型（如消息、公告、在线用户）定义在各自的 api 文件中，随接口走。

---

## 八、views/ —— 视图层（页面）

> 一个文件 = 一个页面路由。与 components 的区别：views 是"完整页面"，components 是"页面里的零件"。

| 文件 | 作用 |
|---|---|
| `LoginView.vue` | **登录/注册页**：登录注册切换、表单校验、错误提示 |
| `HomeView.vue` | **应用外壳**：左侧栏 + 内容区布局，内部用 `<router-view>` 承载聊天页/个人中心页；同时负责在线服务的启动与清理 |
| `chat/ChatView.vue` | **聊天主界面**：消息列表（滚动到底、顶部哨兵触发加载历史）、新消息悬浮提示、在线用户/公告/媒体库面板、输入框、发布公告弹窗 |
| `user/ProfileView.vue` | **个人中心页**：资料卡片展示、编辑抽屉、心情状态、头像选择 → 裁剪 → 上传流程 |

---

## 九、assets/ 与根文件

| 文件 | 作用 |
|---|---|
| `assets/hero.png` | 页面配图（登录页等使用的装饰图） |
| `assets/vite.svg`、`assets/vue.svg` | Vite/Vue 模板自带的示例图标，目前基本未使用 |
| `main.ts` | **应用入口**：创建 Vue 应用、注册 Pinia 与 Router、引入全局样式 |
| `App.vue` | **根组件**：仅含 `<router-view>`（路由出口）+ 全局 AppToast |
| `style.css` | **全局基础样式**：`:root` 设计变量（颜色/圆角/字体）、reset、跨组件共享的工具类；**组件专属样式都写在各自 `.vue` 的 `<style scoped>` 里** |

---

## 十、常见问题速查

- **想加一个新页面？** → 在 `views/` 建文件 → 在 `router/modules/` 加路由 → 需要共享数据就建/用 store
- **想调一个新后端接口？** → 在 `api/` 对应业务文件里加函数（用 `http` 实例）
- **想加一个全局提示？** → 直接用 `showToast('文案')`
- **页面里某段逻辑要复用到别的页面？** → 抽到 `composables/`
- **不确定数据存哪？** → 只在本页面用就放页面里 `ref`；多个页面/组件要用就放 `stores/`
