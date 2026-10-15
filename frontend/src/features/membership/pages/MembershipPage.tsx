import { PageContainer } from "@/components/layout/PageContainer";
import { MembershipTab } from "@/features/settings/components/membership/MembershipTab";

// Menu Data → Membership memakai komponen yang sama dengan Pengaturan → Membership, supaya hanya ada
// satu form paket (termasuk kategori item yang dapat diskon, CRM-014). Versi lama halaman ini tidak
// punya pilihan kategori dan memicu peringatan React (reset form saat render) — QA 2026-10-15.
export function MembershipPage() {
  return (
    <PageContainer>
      <MembershipTab />
    </PageContainer>
  );
}
