// ==========================================
// 错误文案工具：别把后端的中文提示吞掉
// store / 组件的 catch 里统一用它取值，不要再各写一遍三元表达式
// ==========================================
//
// 取值规则完全跟着 src/api/http.ts 响应拦截器的实际行为走：
// 1. HTTP 4xx/5xx 且响应体带 message（429「操作太频繁」、409「这首歌你已经推荐过了」…）
//    → 拦截器已把它写进 error.message，原样透出，用户才知道下一步该干什么。
// 2. HTTP 2xx 但业务失败（code !== 0）→ 拦截器 reject 的是 new Error(body.message)，
//    同样是有意义的中文，透出。
// 3. 断网 / 超时 / 后端没给 message → error.message 是 axios 自己那句英文
//    （Network Error、timeout of 10000ms exceeded、Request failed with status code 500），
//    用户据此做不了任何事，回落到调用方给的固定中文文案。
//
// 这里不 import axios：分层约定是只有 api/ 碰 axios，所以只做结构性判断。

/** axios 错误里我们用得到的两个字段（结构判断，不依赖 axios 类型） */
interface HttpErrorLike {
  isAxiosError?: boolean
  response?: { data?: { message?: unknown } }
}

/** 是不是走 http.ts 出来的错误：axios 自己会打 isAxiosError 标记，兜底看有没有 response */
function asHttpError(e: unknown): HttpErrorLike | null {
  if (typeof e !== 'object' || e === null) {
    return null
  }

  const err = e as HttpErrorLike

  return err.isAxiosError === true || err.response !== undefined ? err : null
}

/**
 * 取一句能直接展示给用户的错误文案。
 *
 * @param e        catch 到的东西（unknown，别在调用处再断言类型）
 * @param fallback 拿不到后端中文 message 时用的固定文案，写清楚"哪一步失败了"
 */
export function errorText(e: unknown, fallback: string): string {
  const httpError = asHttpError(e)

  if (httpError) {
    // 只认后端真正下发的 message；没有就是网络层/无文案的服务端错误 → 固定文案
    const serverMessage = httpError.response?.data?.message

    return typeof serverMessage === 'string' && serverMessage ? serverMessage : fallback
  }

  // 非 HTTP 错误：拦截器为业务失败 reject 的 Error、或代码里自己 throw 的中文 Error
  return e instanceof Error && e.message ? e.message : fallback
}
