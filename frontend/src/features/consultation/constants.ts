export const PROFESSION_OPTIONS = [
  { value: "KANTORAN",   label: "Kantoran" },
  { value: "IRT",        label: "IRT" },
  { value: "FREELANCER", label: "Freelancer atau konten kreator" },
  { value: "OLAHRAGA",   label: "Sering olahraga" },
  { value: "TRAVELLING", label: "Sering travelling atau luar kota" },
  { value: "PELAJAR",    label: "Pelajar atau mahasiswa" },
  { value: "OTHER",      label: "Lainnya" },
];

export const AGE_RANGE_OPTIONS = [
  { value: "BAWAH_25", label: "Di bawah 25" },
  { value: "25_32",    label: "25 - 32" },
  { value: "33_40",    label: "33 - 40" },
  { value: "41_50",    label: "41 - 50" },
  { value: "ATAS_50",  label: "Di atas 50" },
];

export const DAILY_STYLING_OPTIONS = [
  { value: "CATOK",    label: "Catok lurus" },
  { value: "CURLY",    label: "Curly" },
  { value: "WAVE",     label: "Wave" },
  { value: "BLOW",     label: "Blow masuk" },
  { value: "JARANG",   label: "Jarang styling" },
  { value: "DIKUNCIR", label: "Sering dikuncir" },
  { value: "OTHER",    label: "Lainnya" },
];

export const DISCOVERY_OPTIONS = [
  { value: "INSTAGRAM",    label: "Iklan Instagram" },
  { value: "TIKTOK",       label: "FYP TikTok" },
  { value: "REKOMENDASI",  label: "Rekomendasi temen atau keluarga" },
  { value: "KOL",          label: "KOL atau artis tertentu" },
  { value: "LANGGANAN",    label: "Sudah langganan lama" },
  { value: "OTHER",        label: "Lainnya" },
];

export const REASON_SERVICE_OPTIONS = [
  { value: "DIPOTONG_PENDEK",   label: "Rambut dipotong kependekan / salah potong" },
  { value: "TIPIS_RONTOK",      label: "Rambut tipis atau rontok" },
  { value: "RUSAK_TREATMENT",   label: "Rambut rusak karena treatment (bleach, smoothing, dll)" },
  { value: "ACARA_KHUSUS",      label: "Mau acara khusus" },
  { value: "BOSEN",             label: "Bosen sama tampilan sekarang" },
  { value: "DIMINTA_PASANGAN",  label: "Diminta pasangan / orang terdekat" },
  { value: "KECEWA_TEMPAT_LAIN",label: "Pernah kecewa di tempat lain, coba Nia Hair" },
  { value: "LAMA_PENASARAN",    label: "Sudah lama penasaran, baru berani sekarang" },
  { value: "RUTIN_SERVICE",     label: "Rutin service / klien lama" },
  { value: "OTHER",             label: "Lainnya" },
];

export const HESITATION_OPTIONS = [
  { value: "TAKUT_SAKIT",        label: "Takut sakit" },
  { value: "TAKUT_TIDAK_NATURAL",label: "Takut keliatan atau nggak natural" },
  { value: "RAGU_PERAWATAN",     label: "Ragu soal perawatannya" },
  { value: "MAJU_MUNDUR",        label: "Maju mundur lama tapi akhirnya jadi" },
  { value: "TIDAK_ADA",          label: "Tidak ada keraguan" },
  { value: "OTHER",              label: "Lainnya" },
];

export const PREV_EXP_OPTIONS = [
  { value: "BELUM",       label: "Belum pernah sama sekali" },
  { value: "PERNAH_NIA",  label: "Pernah, di Nia Hair juga (klien lama)" },
  { value: "PERNAH_LAIN", label: "Pernah di tempat lain" },
  { value: "OTHER",       label: "Lainnya" },
];

export function getLabel(options: { value: string; label: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
