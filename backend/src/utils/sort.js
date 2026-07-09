'use strict';

/**
 * Resolve Prisma orderBy from a sortBy query param using a module's ORDER_MAP.
 * Convention: prefix "-" = descending. e.g. "-createdAt" → { createdAt: "desc" }
 *
 * @param {string|undefined} sortBy     — value from req.query.sortBy
 * @param {Record<string,object>} map   — module ORDER_MAP
 * @param {string} [defaultKey]         — key used when sortBy is absent or unrecognized
 * @returns {object} Prisma-compatible orderBy object
 */
const resolveOrderBy = (sortBy, map, defaultKey = '-createdAt') => {
  return map[sortBy] ?? map[defaultKey];
};

module.exports = { resolveOrderBy };
