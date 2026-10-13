import { describe, it, expect } from "vitest";
import { uniqueStaffEmployees } from "./staff";
import { isOpenInvoice } from "../invoice/types";

describe("uniqueStaffEmployees", () => {
  it("satu orang dengan beberapa peran dihitung sekali, urutan dipertahankan", () => {
    const a = { id: "a", name: "Ani" };
    const b = { id: "b", name: "Budi" };
    const staffs = [{ employee: a }, { employee: b }, { employee: a }];
    expect(uniqueStaffEmployees(staffs).map((e) => e.name)).toEqual(["Ani", "Budi"]);
  });
});

describe("isOpenInvoice", () => {
  it("UNPAID & PARTIAL = belum lunas; PAID & CANCELLED bukan", () => {
    expect(["UNPAID", "PARTIAL", "PAID", "CANCELLED"].map(isOpenInvoice)).toEqual([true, true, false, false]);
  });
});
