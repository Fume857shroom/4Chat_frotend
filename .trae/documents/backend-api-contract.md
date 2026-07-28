# 前后端接口对接规范文档

> 本文档面向后端开发者，说明前端（Vue 3 + TypeScript）发起的请求格式及期望的响应格式。  
> 前端 **不参与任何业务逻辑处理**，仅做数据转发与展示。

---

## 1. 基础信息

| 项目 | 值 |
|---|---|
| 域名 | `http://4chat_text.com` |
| 前端框架 | Vue 3 + TypeScript + Vite |
| HTTP 请求库 | axios |
| 认证方式 | Bearer Token（存储在 `localStorage`，key 为 `auth_token`） |
| 请求 Content-Type | `application/json` |

---

## 2. 核心原则

1. **前端不参与业务逻辑**：所有验证、密码加密、token 签发等操作均在后端完成。
2. **前端只做三件事**：
   - 收集用户输入，原样发给后端
   - 接收后端返回的数据，原样存储
   - 展示后端返回的信息（成功跳转/失败显示错误）
3. **所有接口统一放在 `/api/auth/` 路径下**（当前阶段）。

---

## 3. 接口详情

### 3.1 用户登录

**请求**

```
POST /api/auth/login
Content-Type: application/json
```

**请求体（前端发送）**

```json
{
  "username": "string",
  "password": "string"
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `username` | `string` | 是 | 用户名 |
| `password` | `string` | 是 | 密码（明文，加密由后端处理） |

**成功响应（前端期望）**

```json
{
  "token": "string",
  "user": {
    "username": "string"
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `token` | `string` | 是 | JWT 或任意凭证字符串，前端原样存到 `localStorage` |
| `user.username` | `string` | 否 | 用户名（有则存，无则跳过） |

**失败响应**

```json
{
  "message": "string"
}
```

或：

```json
{
  "error": "string"
}
```

前端会优先读取 `response.data.message`，其次 `response.data.error`，最后 `error.message`。  
建议统一使用 `message` 字段。

---

### 3.2 用户注册

**请求**

```
POST /api/auth/register
Content-Type: application/json
```

**请求体（前端发送）**

```json
{
  "username": "string",
  "password": "string"
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `username` | `string` | 是 | 用户名 |
| `password` | `string` | 是 | 密码（明文，加密由后端处理） |

**成功响应（前端期望）**

```json
{
  "token": "string",
  "user": {
    "username": "string"
  }
}
```

字段定义与登录接口完全一致。

**失败响应** 格式与登录接口一致。

> 注册与登录的区别仅在于**路由地址不同**，请求体完全相同。后端根据路由区分是注册还是登录，并执行对应逻辑。

---

## 4. 认证机制

### 4.1 前端如何发送 Token

登录/注册成功后，前端将返回的 `token` 存入 `localStorage`（key = `auth_token`），后续所有请求都会自动在请求头中附加：

```
Authorization: Bearer <token>
```

### 4.2 前端如何处理 Token 失效

- 后端返回 `401` 状态码时，前端自动清除本地存储的 `auth_token` 和 `auth_user`
- 前端路由守卫会拦截未认证用户，统一跳转到 `/login`

### 4.3 前端判断登录状态的依据

前端 `router/index.ts` 中的路由守卫逻辑：

```
if (访问需要登录的页面 && localStorage 中不存在 auth_token) → 跳转到 /login
if (访问登录页 && localStorage 中存在 auth_token) → 跳转到 /chat
```

---

## 5. 路由结构（前端已配置）

| 路径 | 页面 | 是否需要登录 |
|---|---|---|
| `/login` | 登录/注册页 | 否（已登录则自动跳转 `/chat`） |
| `/` | 首页容器（左侧功能栏） | 是 |
| `/chat` | 聊天功能页 | 是 |

- 首页默认为 `/login`，登录成功后前端自动跳转到 `/chat`
- 后续新增功能页按 `src/router/modules/` 下分模块管理

---

## 6. 对接检查清单

后端按此清单依次实现即可：

- [ ] 两个接口接受标准的 HTTP POST 请求，Content-Type 为 `application/json`
- [ ] `/api/auth/login` 接受 `{ username, password }`，验证后返回 `{ token, user }`
- [ ] `/api/auth/register` 接受 `{ username, password }`，创建用户后返回 `{ token, user }`
- [ ] 失败时返回 `4xx` 状态码，响应体中包含 `message` 字段说明错误原因
- [ ] token 过期时返回 `401` 状态码
- [ ] 所有 API 路径均拼在 `http://4chat_text.com` 下，如 `http://4chat_text.com/api/auth/login`

---

## 7. 完整请求-响应示例

### 登录成功示例

**请求：**
```
POST http://4chat_text.com/api/auth/login
Content-Type: application/json

{
  "username": "demo",
  "password": "123456"
}
```

**响应（200）：**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9.demo-token-value",
  "user": {
    "username": "demo"
  }
}
```

### 登录失败示例

**请求：** 同上

**响应（401）：**
```json
{
  "message": "用户名或密码错误"
}
```

### 注册成功示例

**请求：**
```
POST http://4chat_text.com/api/auth/register
Content-Type: application/json

{
  "username": "newuser",
  "password": "pass123"
}
```

**响应（200）：**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9.new-user-token",
  "user": {
    "username": "newuser"
  }
}
```

---

> 如果你后端的返回结构与上述示例不同（如字段名不同、嵌套层次不同），请将实际示例发给我，前端将立即调整对齐。
