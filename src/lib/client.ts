export async function api<T = Record<string, unknown>>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Máy chủ chưa phản hồi được. Vui lòng thử lại.");
  }
  if (!response.ok) throw new Error(data.error || "Thao tác chưa thành công.");
  return data;
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Đã có lỗi xảy ra. Vui lòng thử lại.";
}
