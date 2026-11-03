import { publicSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/settings-form";
export default async function Settings() {
  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Kết nối trí tuệ nhân tạo.</h1>
          <p>Cấu hình riêng cho việc viết bài và trò chuyện.</p>
        </div>
      </header>
      <SettingsForm initial={await publicSettings()} />
    </>
  );
}
