// Payload customer/save.do Accurate.
// Pelanggan baru: hanya kolom yang terisi.
// Ubah pelanggan (accurateCustomerId ada): sertakan `id` dan kirim kolom kosong sebagai ""
// agar data yang dikosongkan di aplikasi juga kosong di Accurate (B3/B4).
const FIELD_MAP = [
  ["email",       "email"],
  ["mobilePhone", "mobilePhone"],
  ["address",     "billStreet"],
  ["city",        "billCity"],
  ["province",    "billProvince"],
  ["notes",       "notes"],
];

const mapCustomerToAccurate = (customer) => {
  const isUpdate = !!customer.accurateCustomerId;
  const payload = isUpdate
    ? { id: customer.accurateCustomerId, name: customer.name }
    : { name: customer.name };
  for (const [local, remote] of FIELD_MAP) {
    if (customer[local])  payload[remote] = customer[local];
    else if (isUpdate)    payload[remote] = "";
  }
  return payload;
};

module.exports = { mapCustomerToAccurate };
