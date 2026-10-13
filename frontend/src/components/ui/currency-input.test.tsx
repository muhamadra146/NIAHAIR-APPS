import { describe, it, expect, vi, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CurrencyInput } from "./currency-input";

afterEach(cleanup);

// Semua input nominal uang tampil "Rp 1.000.000", nilai form tetap angka

function Harness({ initial = "", onDigits }: { initial?: string; onDigits?: (v: string) => void }) {
  const [v, setV] = useState(initial);
  return <CurrencyInput aria-label="nominal" value={v} onValueChange={(d) => { setV(d); onDigits?.(d); }} />;
}

describe("CurrencyInput", () => {
  it("mengetik 1500000 tampil 1.500.000", async () => {
    render(<Harness />);
    const input = screen.getByLabelText("nominal") as HTMLInputElement;
    await userEvent.type(input, "1500000");
    expect(input.value).toBe("1.500.000");
  });

  it("onChange mengirim angka, bukan teks berformat", async () => {
    const onChange = vi.fn();
    render(<CurrencyInput aria-label="nominal" value={0} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("nominal"), "7");
    expect(onChange).toHaveBeenLastCalledWith(7);
  });

  it("nilai Decimal dari API ('150000.00') tampil 150.000", () => {
    render(<CurrencyInput aria-label="nominal" value="150000.00" onChange={() => {}} />);
    expect((screen.getByLabelText("nominal") as HTMLInputElement).value).toBe("150.000");
  });

  it("menghapus semua → string kosong (bukan 0) untuk isian opsional", async () => {
    const onDigits = vi.fn();
    render(<Harness initial="5000" onDigits={onDigits} />);
    await userEvent.clear(screen.getByLabelText("nominal"));
    expect(onDigits).toHaveBeenLastCalledWith("");
  });

  it("huruf diabaikan", async () => {
    render(<Harness />);
    const input = screen.getByLabelText("nominal") as HTMLInputElement;
    await userEvent.type(input, "12a3");
    expect(input.value).toBe("123");
  });

  it("awalan Rp tampil, dan bisa dimatikan", () => {
    const { rerender } = render(<CurrencyInput aria-label="nominal" value={1} onChange={() => {}} />);
    expect(screen.queryByText("Rp")).not.toBeNull();
    rerender(<CurrencyInput aria-label="nominal" value={1} onChange={() => {}} prefix={false} />);
    expect(screen.queryByText("Rp")).toBeNull();
  });
});
