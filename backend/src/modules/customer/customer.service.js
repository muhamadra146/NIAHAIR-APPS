const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { resolveOrderBy } = require("../../utils/sort");

const ORDER_MAP = {
  name:         { name: "asc" },
  "-name":      { name: "desc" },
  createdAt:    { createdAt: "asc" },
  "-createdAt": { createdAt: "desc" },
  customerNo:   { customerNo: "asc" },
  "-customerNo":{ customerNo: "desc" },
};
const {
  findAll,
  count,
  findById,
  findByCustomerNo,
  findByPhone,
  findByEmail,
  findMaxCustomerNo,
  create,
  update,
} = require("./customer.repository");
const { createSyncJob } = require("../syncQueue/syncQueue.service");
const { canonicalPhone, escapeLike } = require("./customer.fields");

// ── Auto generate customer number: CUS-000001 ─────────────────────────
const buildCustomerNo = async () => {
  const maxSeq = await findMaxCustomerNo();
  return `CUS-${String(maxSeq + 1).padStart(6, "0")}`;
};

const getAll = async ({ page, limit, search, isActive, syncStatus, sortBy, membershipId, hasDeposit }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const orderBy = resolveOrderBy(sortBy, ORDER_MAP);

  const where = {};

  if (search) {
    // "%" / "_" dibaca harfiah, bukan wildcard LIKE
    const term = escapeLike(search);
    where.OR = [
      { name:       { contains: term, mode: "insensitive" } },
      { email:      { contains: term, mode: "insensitive" } },
      { mobilePhone: { contains: term, mode: "insensitive" } },
      { customerNo:  { contains: term, mode: "insensitive" } },
    ];
    // Cari nomor "0812…" juga menemukan data tersimpan "62812…"
    const phone = canonicalPhone(search);
    if (/^\d{4,}$/.test(phone) && phone !== search) {
      where.OR.push({ mobilePhone: { contains: phone } });
    }
  }

  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }

  if (syncStatus) where.syncStatus = syncStatus;

  // Filter membership: "none" = tanpa membership, string ID = membership tertentu
  if (membershipId === "none") {
    where.membershipId = null;
  } else if (membershipId) {
    where.membershipId = membershipId;
  }

  // Filter deposit: "true" = ada sisa deposit (PAID / PARTIAL_USED), "false" = tidak ada sisa
  if (hasDeposit === "true") {
    where.deposits = { some: { status: { in: ["PAID", "PARTIAL_USED"] } } };
  } else if (hasDeposit === "false") {
    where.deposits = { none: { status: { in: ["PAID", "PARTIAL_USED"] } } };
  }

  const [customers, total] = await Promise.all([
    findAll({ skip, take, where, orderBy }),
    count(where),
  ]);

  return {
    data: customers,
    meta: paginationMeta(total, pageNum, limitNum),
  };
};

const getById = async (id) => {
  const customer = await findById(id);
  if (!customer) throw new AppError("Customer tidak ditemukan", StatusCodes.NOT_FOUND);
  return customer;
};

const createCustomer = async (body) => {
  // Nomor HP & email disimpan dalam bentuk baku (628xx, huruf kecil)
  if (body.mobilePhone) body.mobilePhone = canonicalPhone(body.mobilePhone);
  if (typeof body.email === "string") body.email = body.email.trim().toLowerCase() || null;

  // CRM-001 + CRM-005: Duplicate detection by phone (08xx = 628xx = +62 8xx)
  if (body.mobilePhone) {
    const byPhone = await findByPhone(body.mobilePhone);
    if (byPhone) {
      throw new AppError(
        `Customer dengan nomor telepon ${body.mobilePhone} sudah ada (${byPhone.name} / ${byPhone.customerNo ?? byPhone.id})`,
        StatusCodes.CONFLICT,
      );
    }
  }

  // CRM-001: Duplicate detection by email (tanpa beda huruf besar/kecil)
  if (body.email) {
    const byEmail = await findByEmail(body.email);
    if (byEmail) {
      throw new AppError(
        `Customer dengan email ${body.email} sudah ada (${byEmail.name} / ${byEmail.customerNo ?? byEmail.id})`,
        StatusCodes.CONFLICT,
      );
    }
  }

  if (body.birthDate) body.birthDate = new Date(body.birthDate);

  // CRM-002: Auto-generate customer number (never allow manual input)
  // Retry once on P2002 unique collision from concurrent requests
  let customer;
  try {
    const customerNo = await buildCustomerNo();
    customer = await create({ ...body, customerNo });
  } catch (err) {
    if (err?.code === "P2002" && err?.meta?.target?.includes("customerNo")) {
      const customerNo = await buildCustomerNo();
      customer = await create({ ...body, customerNo });
    } else {
      throw err;
    }
  }

  // Queue Accurate push — worker picks it up asynchronously
  await createSyncJob({
    entityType: "CUSTOMER",
    entityId:   customer.id,
    direction:  "APP_TO_ACCURATE",
  });

  return { customer, message: "Customer created, sync queued" };
};

const updateCustomer = async (id, body) => {
  const customer = await findById(id);
  if (!customer) throw new AppError("Customer tidak ditemukan", StatusCodes.NOT_FOUND);

  // CRM-005: Phone uniqueness check on update (dibandingkan dalam bentuk baku)
  if (body.mobilePhone) {
    body.mobilePhone = canonicalPhone(body.mobilePhone);
    if (body.mobilePhone === canonicalPhone(customer.mobilePhone ?? "")) {
      // Nomor sama dengan yang tersimpan — jangan tulis ulang format data lama
      delete body.mobilePhone;
    } else {
      const byPhone = await findByPhone(body.mobilePhone, id);
      if (byPhone) {
        throw new AppError(
          `Nomor telepon ${body.mobilePhone} sudah digunakan oleh customer lain (${byPhone.name})`,
          StatusCodes.CONFLICT,
        );
      }
    }
  }

  // CRM-001: Email uniqueness check on update (tanpa beda huruf besar/kecil)
  if (typeof body.email === "string") body.email = body.email.trim().toLowerCase() || null;
  if (body.email && body.email !== (customer.email ?? "").trim().toLowerCase()) {
    const byEmail = await findByEmail(body.email, id);
    if (byEmail) {
      throw new AppError(
        `Email ${body.email} sudah digunakan oleh customer lain (${byEmail.name})`,
        StatusCodes.CONFLICT,
      );
    }
  }

  // CRM-002: customerNo tidak boleh diubah
  delete body.customerNo;

  // null = kosongkan tanggal lahir (B4)
  if (body.birthDate) body.birthDate = new Date(body.birthDate);

  // Perubahan data pelanggan ikut dikirim ke Accurate (B3) — tandai menunggu sinkron
  const pushToAccurate = ACCURATE_FIELDS.some((f) => body[f] !== undefined && body[f] !== customer[f]);
  const updated = await update(id, pushToAccurate ? { ...body, syncStatus: "PENDING", syncError: null } : body);

  if (pushToAccurate) {
    await createSyncJob({
      entityType: "CUSTOMER",
      entityId:   id,
      direction:  "APP_TO_ACCURATE",
    });
  }

  return updated;
};

// Kolom yang dikirim ke Accurate (lihat customer.push.mapper)
const ACCURATE_FIELDS = ["name", "mobilePhone", "email", "address", "city", "province", "notes"];

module.exports = { getAll, getById, createCustomer, updateCustomer };
