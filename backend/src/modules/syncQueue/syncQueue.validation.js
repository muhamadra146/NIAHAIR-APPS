const { object, string, pipe, optional, picklist, minLength } = require("valibot");

const ENTITY_TYPES = ["CUSTOMER","WAREHOUSE","ITEM","UNIT","ITEM_UNIT","ITEM_PRICE","INVENTORY","DEPOSIT","INVOICE","PAYMENT"];
const DIRECTIONS   = ["APP_TO_ACCURATE", "ACCURATE_TO_APP"];
const STATUSES     = ["PENDING", "PROCESSING", "SUCCESS", "FAILED"];

const createSyncJobSchema = object({
  entityType: picklist(ENTITY_TYPES, "Jenis data tidak valid"),
  entityId:   optional(string()),
  direction:  picklist(DIRECTIONS, "Arah sinkron tidak valid"),
  payload:    optional(object({})),
});

module.exports = { createSyncJobSchema, ENTITY_TYPES, DIRECTIONS, STATUSES };
