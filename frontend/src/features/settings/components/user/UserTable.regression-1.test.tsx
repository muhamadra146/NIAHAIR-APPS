import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserTable } from "./UserTable";
import type { User } from "../../types";

// Regression: ISSUE-002 — tombol ikon Edit dan Hapus di tabel User tidak punya nama aksesibel;
// pembaca layar hanya membaca "button", jadi Edit dan Hapus tidak bisa dibedakan.
// Found by /qa on 2026-10-15
// Report: .gstack/qa-reports/run-20261015T083444Z/qa-report-localhost-2026-10-15.md
// Value: protects=Edit/Hapus icon buttons expose names and trigger the right handler; fails_when=a label
// is removed or swapped; why_new=no UserTable test existed; seam=none; no_claim=visual tooltip rendering

afterEach(cleanup);

const USER: User = {
  id: "u1", email: "office@x.id", username: "office", employeeId: "e1", isActive: true,
  role: { id: "r1", code: "OFFICE", name: "Office" },
  employee: { id: "e1", name: "OFFICE", employeeCode: "EMP003" },
};

describe("UserTable — tombol ikon punya nama", () => {
  it("Edit dan Hapus bisa ditemukan lewat namanya dan memanggil aksi yang benar", async () => {
    const onEdit = vi.fn();
    render(<UserTable users={[USER]} isLoading={false} onEdit={onEdit} onResetPw={vi.fn()} onDelete={vi.fn()} />);

    // Tampilan HP dan desktop sama-sama dirender di jsdom → masing-masing ada 2
    expect(screen.getAllByRole("button", { name: "Edit user OFFICE" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Hapus user OFFICE" })).toHaveLength(2);

    await userEvent.click(screen.getAllByRole("button", { name: "Edit user OFFICE" })[0]);
    expect(onEdit).toHaveBeenCalledWith(USER);
  });
});
