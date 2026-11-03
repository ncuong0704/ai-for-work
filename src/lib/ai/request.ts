import { HttpError } from "../http";

export async function providerRequest(
  url: string,
  init: RequestInit,
  provider: string,
  timeout = 60_000,
) {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeout),
      cache: "no-store",
    });
  } catch {
    throw new HttpError(
      504,
      `${provider} phản hồi chậm hoặc mất kết nối. Vui lòng thử lại.`,
    );
  }
  if (!response.ok) {
    // Never return raw provider responses that may echo credentials.
    if (response.status === 429)
      throw new HttpError(
        429,
        `${provider} đang giới hạn lượt gọi. Vui lòng đợi rồi tạo lại chủ đề bị lỗi.`,
      );
    if (response.status === 401)
      throw new HttpError(
        503,
        `API key ${provider} không hợp lệ hoặc đã bị thu hồi. Kiểm tra lại khóa trong Settings.`,
      );
    if (response.status === 403)
      throw new HttpError(
        503,
        `${provider} từ chối quyền truy cập. Kiểm tra quyền của API key, dự án và model trong tài khoản nhà cung cấp.`,
      );
    throw new HttpError(
      502,
      `${provider} chưa xử lý được yêu cầu (${response.status}). Kiểm tra model trong Settings hoặc thử lại sau.`,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new HttpError(502, `${provider} trả dữ liệu không hợp lệ.`);
  }
}
