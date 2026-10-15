const { object, string, optional, picklist, record, unknown } = require("valibot");
const { SyncEntityType, SyncDirection, SyncQueueStatus } = require("@prisma/client");

// Diturunkan dari enum Prisma agar selalu sama dengan schema (G5-12)
const ENTITY_TYPES = Object.values(SyncEntityType);
const DIRECTIONS   = Object.values(SyncDirection);
const STATUSES     = Object.values(SyncQueueStatus);

const createSyncJobSchema = object({
  entityType: picklist(ENTITY_TYPES, "Jenis data tidak valid"),
  entityId:   optional(string()),
  direction:  picklist(DIRECTIONS, "Arah sinkron tidak valid"),
  // record — object({}) membuang semua key sehingga payload tersimpan {} (G5-11)
  payload:    optional(record(string(), unknown())),
});

module.exports = { createSyncJobSchema, ENTITY_TYPES, DIRECTIONS, STATUSES };
