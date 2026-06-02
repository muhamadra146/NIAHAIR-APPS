const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { accurateRequest } = require("../accurate/accurate.client");
const { mapAccurateToCustomer } = require("./customer.sync.mapper");
const { findByAccurateId, createFromAccurate, updateByAccurateId } = require("./customer.sync.repository");

const ACCURATE_CUSTOMER_LIST = "/customer/list.do";
const ACCURATE_FIELDS = "id,name,no,email,mobilePhone,whatsapp,address,city,province";

const syncCustomersFromAccurate = async () => {
  let page = 1;
  let pageCount = 1;
  let accurateRowCount = 0;

  // Counters — each represents a real action, never estimated.
  let created = 0;
  let updated = 0;
  let skippedDuplicate = 0;
  let failed = 0;

  // Task 1 — collect every raw ID returned by Accurate across all pages.
  const accurateIds = [];

  // Task 2 — track which IDs have already been processed in this run.
  // Prevents the same Accurate customer from being written twice when
  // the API returns duplicate IDs across page boundaries.
  const processedIds = new Set();

  do {
    const response = await accurateRequest(
      `${ACCURATE_CUSTOMER_LIST}?fields=${ACCURATE_FIELDS}&sp.page=${page}`
    );

    if (!response.s) {
      throw new AppError(
        `Accurate API returned error on page ${page}`,
        StatusCodes.BAD_GATEWAY
      );
    }

    pageCount = response.sp?.pageCount ?? 1;
    accurateRowCount = response.sp?.rowCount ?? 0;

    const customers = response.d ?? [];
    console.log("SYNC ACCURATE CUSTOMER PAGE:", page, "/", pageCount);
    console.log("FIRST CUSTOMER ID:", customers[0]?.id);

    for (const item of customers) {
      // Task 1: record raw ID before any guard so totals are honest.
      accurateIds.push(item.id);

      // Guard: Accurate returned an item with no id — nothing we can key on.
      if (!item.id) {
        failed++;
        continue;
      }

      const accurateId = parseInt(item.id, 10);

      // Task 2: duplicate guard — same ID already handled earlier in this run.
      if (processedIds.has(accurateId)) {
        console.log("SKIP DUPLICATE:", accurateId);
        skippedDuplicate++;
        continue;
      }
      processedIds.add(accurateId);

      try {
        const mapped = mapAccurateToCustomer(item);

        // Task 3: lookup ONLY by accurateCustomerId.
        const existing = await findByAccurateId(accurateId);

        if (existing) {
          // Row existed before this sync — this is a real update.
          console.log("UPDATE:", accurateId, existing.id);
          const { accurateCustomerId, ...updateData } = mapped;
          await updateByAccurateId(accurateId, updateData);
          updated++;
        } else {
          // No matching row — this is a real create.
          console.log("CREATE:", accurateId);
          await createFromAccurate({ ...mapped, isActive: true });
          created++;
        }
      } catch (_err) {
        failed++;
      }
    }

    page++;
  } while (page <= pageCount);

  // ── Task 1: duplicate ID analysis ────────────────────────────────────────
  const uniqueAccurateIds = new Set(accurateIds.filter(Boolean));
  console.log({
    totalFromAccurate: accurateIds.length,
    uniqueFromAccurate: uniqueAccurateIds.size,
    duplicate: accurateIds.length - uniqueAccurateIds.size,
  });

  if (accurateIds.length !== uniqueAccurateIds.size) {
    const frequency = {};
    for (const id of accurateIds) {
      if (id) frequency[id] = (frequency[id] || 0) + 1;
    }
    const duplicateIds = Object.entries(frequency)
      .filter(([, count]) => count > 1)
      .map(([id, count]) => ({ id: Number(id), count }));
    console.log("DUPLICATE IDs:", duplicateIds);
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Task 4: final validation log.
  const totalProcessed = created + updated + skippedDuplicate + failed;
  console.log("SYNC COMPLETE", {
    accurateRowCount,
    uniqueIds: processedIds.size,
    created,
    updated,
    skippedDuplicate,
    failed,
    totalProcessed,
  });

  return { created, updated, skippedDuplicate, failed };
};

module.exports = { syncCustomersFromAccurate };
