# 五子棋（Gomoku）后端接口对接文档

> 本文档面向后端开发者，说明前端（Vue 3 + TypeScript）五子棋功能发起的请求格式及期望的响应格式。  
> **模式：全站仅一个五子棋房间，常驻，支持观战。进入页面不占位，点击"加入房间"才占位；离开页面退出让位（sendBeacon）；重开投票制。**  
> 前端代码位置：`src/api/fun/gomoku.ts`、`src/composables/useGomokuGame.ts`、`src/views/fun/GomokuView.vue`、`src/components/fun/GomokuBoard.vue`

---

## 1. 基础信息

| 项目 | 值 |
|---|---|
| 接口前缀 | `/api/v1/gomoku` |
| 认证方式 | Bearer Token（`Authorization: Bearer <token>`） |
| 请求 Content-Type | `application/json` |
| 棋盘规格 | 15×15，坐标 `x` / `y` 取值范围 **0-14** |
| 响应格式 | **扁平结构**（直接返回业务对象，无 `code/message/data` 外壳） |
| 数据存储 | Redis（常驻单房间，对局结束留在房间，可投票"再来一局"） |
| 占位机制 | 进入页面只 `GET /current` 查看（不占位）；点击"加入房间"才 `POST /new` 或 `/join` 占位 |
| 释放机制 | 主动 `POST /leave`（路由切换用 `navigator.sendBeacon`）；SSE 断线 60s 未重连自动释放 |
| 重开机制 | 投票制：双方都 `POST /restart` 才真正重开（败者执黑） |

> ⚠️ 与 auth / calendar 接口的包裹格式不同，**五子棋接口使用扁平格式**（前端已按此实现）。

---

## 2. 数据模型

### 2.1 Move（一步棋）

```json
{
  "usersId": 1,
  "moveIndex": 0,
  "x": 7,
  "y": 7
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `usersId` | `number` | 落子用户 id |
| `moveIndex` | `number` | 步数序号，从 0 开始（偶数=黑方，奇数=白方） |
| `x` | `number` | 横坐标 0-14 |
| `y` | `number` | 纵坐标 0-14 |

### 2.2 Player（玩家信息）

```json
{
  "id": 16,
  "username": "gomokuA",
  "avatar": "/uploads/avatars/16.png"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `number` | 用户 id |
| `username` | `string` | 用户名 |
| `avatar` | `string \| null` | 头像相对路径；未设置头像为 `null` |

### 2.3 Game（对局）

```json
{
  "id": 3,
  "status": "waiting",
  "blackPlayerId": 16,
  "whitePlayerId": 0,
  "winnerId": null,
  "moves": [],
  "restartVotes": [],
  "players": {
    "black": { "id": 16, "username": "gomokuA", "avatar": "/uploads/avatars/16.png" },
    "white": null
  }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `number` | 对局 ID（房间延续：重开不变，新对局 +1） |
| `status` | `string` | `waiting` / `playing` / `finished` |
| `blackPlayerId` | `number` | 黑方用户 id（先行） |
| `whitePlayerId` | `number` | 白方用户 id；`waiting` 时为 `0` |
| `winnerId` | `number \| null` | 赢家用户 id；未结束或**平局**时为 `null` |
| `moves` | `Move[]` | 全量棋谱（按落子顺序） |
| `restartVotes`（新增） | `number[]` | 已同意「再来一局」的玩家 id 数组；双方都在 → 重开（清空 `[]`） |
| `players.black` | `Player` | 永不为 null（任何状态下都有值，顶多内部 `avatar` 为 null） |
| `players.white` | `Player \| null` | `waiting` 时为 `null` |

### 2.4 GameEvent（SSE 推送事件）

| type | 附加字段 | 触发时机 | 前端处理 |
|---|---|---|---|
| `connected` | — | 连接建立确认 | 忽略（或刷新） |
| `joined` | — | 对手加入，开局 | 刷新全量 |
| `move` | — | 任何一方落子成功 | 刷新全量 |
| `finished` | `winnerId` | 对局结束（五连/平局，平局 `winnerId: null`） | 刷新全量并展示结果 |
| `player_left` | `userId` | 对手退出房间（房间重置或删除） | 刷新全量；若 404 重置为无房间 |
| `restart_request` | `byUserId` | 对方点击「再来一局」 | 刷新全量（restartVotes 更新），UI 显示「同意」按钮 |
| `restart` | — | 双方同意后重开（棋盘清空，黑白可能交换） | 刷新全量 |

> 前端对**所有事件统一处理**：调 `GET /:gameId` 全量刷新（简单可靠，不做增量同步）。

---

## 3. 接口详情

### 3.1 获取当前房间

```
GET /api/v1/gomoku/current
```

**成功响应（200）**：

- 有对局 → 直接返回 `Game`
- 无对局（首次进入 / Redis 重启后）→ 返回 `null`

**失败**：`401` 未认证

### 3.2 进入房间（创建/幂等）

```
POST /api/v1/gomoku/new
```

**请求体**：无

**成功响应（200）**：直接返回 `Game`（创建者执黑）

**语义（按当前房间状态分流）**：

| 当前状态 | 行为 |
|---|---|
| 无对局 / `finished` | 创建新对局，返回 `Game` |
| `waiting` 且黑方是本人 | **幂等**返回当前 `Game`（刷新页面场景） |
| `waiting` 且非本人 | `409` `已有玩家等待，请直接加入` |
| `playing` | `409` `对局进行中` |

### 3.3 加入对局

```
POST /api/v1/gomoku/join/:gameId
```

**请求体**：无

**成功响应（200）**：直接返回 `Game`（加入者执白，`status: "playing"`）；**任一方本人重进 → 幂等返回 200**（刷新页面场景）

**失败**：

| 状态码 | 场景 |
|---|---|
| `404` | 对局不存在 |
| `409` | 对局已满 / 对局已结束 |

### 3.4 落子

```
POST /api/v1/gomoku/move/:gameId
Content-Type: application/json
```

**请求体**

```json
{
  "x": 7,
  "y": 7
}
```

**成功响应（200）**：直接返回更新后的 `Game`（含全量 `moves` 与 `players`，前端整体替换本地状态）

**失败（后端必须校验，返回 4xx + `message`）**：

| 状态码 | 校验规则 | message 示例 |
|---|---|---|
| `400` | 坐标越界（x/y 不在 0-14） | `坐标超出棋盘范围` |
| `403` | 不是该对局的玩家（观战者落子） | `您不是该对局的玩家` |
| `409` | 位置已有棋子 | `该位置已有棋子` |
| `409` | 非当前回合 | `未轮到您落子` |
| `409` | 对局未开始或已结束 | `对局不在进行中` |
| `404` | 对局不存在 | `对局不存在` |

### 3.5 重新开始

```
POST /api/v1/gomoku/restart
```

**请求体**：无（后端从 token 解析当前用户所在房间）

**成功响应（200）**：

- **第一票**：`status: "finished"`，`restartVotes` 包含我已投票，`moves` 不变（棋盘保留）
- **第二票**：`status: "playing"`，`restartVotes: []`，`moves: []`，**败者执黑**、平局保持黑白

**失败**：

| 状态码 | 场景 |
|---|---|
| `403` | 非参与者（观战者调 restart） |
| `409` | 对局未结束（`status !== "finished"`） |

### 3.6 退出房间释放位置

```
POST /api/v1/gomoku/leave?token=<token>
```

**说明**：前端路由切换/组件卸载时调用 `navigator.sendBeacon`，无法带 Authorization header → token 通过 query 参数传递（与 SSE 一致）。

**成功响应（200）**：房间已释放，响应体无意义（前端不关心响应）。

**失败**：`401` 未认证（token 失效），`404` 房间不存在

### 3.7 获取对局（全量同步）

```
GET /api/v1/gomoku/:gameId
```

**成功响应（200）**：直接返回 `Game`（含全量棋谱与 `players`）。前端在 SSE 收到事件后调用此接口全量刷新。

**失败**：`404` / `401`

### 3.8 SSE 事件流

```
GET /api/v1/gomoku/:gameId/events?token=<token>
```

> 前端使用 `EventSource` 连接，**token 通过 query 参数传递**（EventSource 无法自定义 Header）。  
> **观战者也可连接**（非参与者实时观战）。  
> 断线后浏览器自动重连，后端需支持重复连接。连接建立后先推 `{ type: "connected" }`。

---

## 4. 后端业务规则

### 4.1 落子校验（按顺序执行）

1. 请求者已认证
2. 请求者是该对局的黑方或白方（否则 `403`）
3. 对局状态为 `playing`（否则 `409`）
4. 轮到请求者落子：`moves.length % 2 === 0` → 黑方（`blackPlayerId`），否则白方
5. 坐标在 0-14 范围内
6. 该位置没有已有棋子

### 4.2 胜负判定（落子成功后）

以落子点 `(x, y)` 为中心，沿 4 个方向（横、竖、主对角、副对角）向两端数**连续同色**棋子：

```
某个方向连续数 ≥ 5 → 该落子方获胜
```

- 获胜 → `status: "finished"`，`winnerId` = 落子方 id，推送 `{ type: "finished", winnerId }`
- 未获胜但 `moves.length === 225` → `status: "finished"`，`winnerId: null`（**平局**），推送 `{ type: "finished", winnerId: null }`
- 否则 → `status: "playing"`，推送 `{ type: "move" }`

### 4.3 重开规则（投票制）

- 仅 `finished` 状态可调 restart（否则 `409`）
- 仅双方可调（观战者 `403`）
- **第一票**：记录投票者 id 到 `restartVotes`，`status` 保持 `finished`，推送 `{ type: "restart_request", byUserId }`
- **第二票**：**败者执黑**；平局保持原黑白；`status` → `playing`，`restartVotes: []`，`moves: []`，`id` 不变，推送 `{ type: "restart" }`

### 4.4 对局流转

```
（无房间）→ new（加入房间，当前用户执黑）→ waiting（等白方）
→ join（白方加入）→ playing → finished → restart（第一票）→ finished（等待第二票）
→ restart（第二票）→ playing
```

- `waiting` 阶段**不允许落子**
- `finished` 后落子返回 `409`，但可调 `restart`
- 对手离开（`player_left`）→ 房间重置为 `waiting`（白方清空，黑方保留）
- 双方都离开 → 房间可删除（`GET /current` 返回 `null`）

---

## 5. 对接检查清单

- [ ] `GET /current`：有对局返回 `Game`，无对局返回 `null`（**进入页面先调此接口，不占位**）
- [ ] `POST /new`：按 3.2 分流（创建/幂等/409），创建者执黑
- [ ] `POST /join/:id`：加入执白；本人重进幂等 200
- [ ] `POST /move/:id`：接收 `{x, y}`，完成 4.1 全部校验，返回更新后 `Game`
- [ ] `POST /restart`：投票制：第一票记录 `restartVotes`，第二票才真正重开（败者执黑）
- [ ] `POST /leave`：接收 `?token=` query 参数，释放房间位置
- [ ] `GET /:id`：返回含全量 `moves`、`players`、`restartVotes` 的 `Game`
- [ ] `GET /:id/events`：SSE 长连接，`?token=` 鉴权，连接后推 `connected`，其余事件见 2.4
- [ ] 所有 `Game` 响应均携带 `players` 字段（`black` 永不 null）和 `restartVotes` 字段
- [ ] 失败响应为 4xx + `message` 字段
- [ ] `401` 时前端自动清 token 跳登录页（http.ts 拦截器已处理）

---

## 6. 完整请求-响应示例

### 用户 A 进入（无房间，自动创建）

**请求：**
```
GET http://4chat_text.com/api/v1/gomoku/current
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.demo-token
```

**响应（200）：**
```json
null
```

**请求：**
```
POST http://4chat_text.com/api/v1/gomoku/new
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.demo-token
```

**响应（200）：**
```json
{
  "id": 3,
  "status": "waiting",
  "blackPlayerId": 16,
  "whitePlayerId": 0,
  "winnerId": null,
  "moves": [],
  "players": {
    "black": { "id": 16, "username": "gomokuA", "avatar": "/uploads/avatars/16.png" },
    "white": null
  }
}
```

### 用户 B 加入

**请求：**
```
POST http://4chat_text.com/api/v1/gomoku/join/3
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.other-token
```

**响应（200）：**
```json
{
  "id": 3,
  "status": "playing",
  "blackPlayerId": 16,
  "whitePlayerId": 17,
  "winnerId": null,
  "moves": [],
  "players": {
    "black": { "id": 16, "username": "gomokuA", "avatar": "/uploads/avatars/16.png" },
    "white": { "id": 17, "username": "gomokuB", "avatar": null }
  }
}
```

### 黑方落子（第 1 手）

**请求：**
```
POST http://4chat_text.com/api/v1/gomoku/move/3
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.demo-token
Content-Type: application/json

{ "x": 7, "y": 7 }
```

**响应（200）：**
```json
{
  "id": 3,
  "status": "playing",
  "blackPlayerId": 16,
  "whitePlayerId": 17,
  "winnerId": null,
  "moves": [
    { "usersId": 16, "moveIndex": 0, "x": 7, "y": 7 }
  ],
  "players": {
    "black": { "id": 16, "username": "gomokuA", "avatar": "/uploads/avatars/16.png" },
    "white": { "id": 17, "username": "gomokuB", "avatar": null }
  }
}
```

### 观战者落子（被拒）

**响应（403）：**
```json
{
  "message": "您不是该对局的玩家"
}
```

### 再来一局（败者执黑，id 不变）

**请求：**
```
POST http://4chat_text.com/api/v1/gomoku/restart
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.demo-token
```

**响应（200）：**
```json
{
  "id": 3,
  "status": "playing",
  "blackPlayerId": 17,
  "whitePlayerId": 16,
  "winnerId": null,
  "moves": [],
  "players": {
    "black": { "id": 17, "username": "gomokuB", "avatar": null },
    "white": { "id": 16, "username": "gomokuA", "avatar": "/uploads/avatars/16.png" }
  }
}
```

---

> 如果你后端的返回结构与上述示例不同（如字段名不同、嵌套层次不同），请将实际示例发给我，前端将立即调整对齐。
