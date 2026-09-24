'use strict';

const logger = require('../../utils/logger');
/**
 * branchAccurate.service.js
 * Sync branches FROM Accurate Online → local Branch table.
 *
 * Accurate does NOT expose a /branch endpoint in the standard SDK — it uses
 * /branch/list.do with scope branch_view.  Each Accurate Branch maps 1-to-1
 * with a local Branch record; matching is done by name (case-insensitive).
 */

const { StatusCodes }     = require("http-status-codes");
const AppError            = require("../../common/errors/AppError");
const { accurateRequest } = require("../accurate/accurate.client");
const prisma              = require("../../config/prisma");

const ACCURATE_BRANCH_LIST = "/branch/list.do";
const ACCURATE_FIELDS      = "id,name,inactive";

// ── Sync FROM Accurate → local Branch ─────────────────────────────────

const syncBranchesFromAccurate = async () => {
  let page      = 1;
  let pageCount = 1;
  let matched   = 0;
  let unmatched = 0;
  let failed    = 0;

  const accurateBranches = [];

  // Step 1: Fetch all branches from Accurate (paginated)
  do {
    const response = await accurateRequest(
      `${ACCURATE_BRANCH_LIST}?fields=${ACCURATE_FIELDS}&sp.page=${page}`
    );

    if (!response.s) {
      throw new AppError(
        `Accurate API error on branches page ${page}: ${JSON.stringify(response)}`,
        StatusCodes.BAD_GATEWAY
      );
    }

    pageCount = response.sp?.pageCount ?? 1;
    const branches = response.d ?? [];
    logger.info(`[branch sync] page ${page}/${pageCount} — ${branches.length} items`);

    for (const b of branches) {
      if (!b.id) continue;
      accurateBranches.push({
        accurateBranchId: parseInt(b.id, 10),
        name:             b.name || `Branch ${b.id}`,
        isActive:         !b.inactive,
      });
    }

    page++;
  } while (page <= pageCount);

  if (accurateBranches.length === 0) {
    return { total: 0, matched: 0, unmatched: 0, failed: 0, results: [] };
  }

  // Step 2: Load all local branches for matching
  const localBranches = await prisma.branch.findMany({
    select: { id: true, name: true, accurateBranchId: true },
  });

  const results = [];

  for (const ab of accurateBranches) {
    try {
      // Priority 1: already mapped by accurateBranchId → just update name/status
      const alreadyMapped = localBranches.find(
        (lb) => lb.accurateBranchId === ab.accurateBranchId
      );
      if (alreadyMapped) {
        await prisma.branch.update({
          where: { id: alreadyMapped.id },
          data:  { name: ab.name, isActive: ab.isActive, lastSyncAt: new Date() },
        });
        matched++;
        results.push({
          accurateBranchId: ab.accurateBranchId,
          name:             ab.name,
          localId:          alreadyMapped.id,
          status:           "updated",
        });
        logger.info(`[branch sync] updated accurateId=${ab.accurateBranchId} name="${ab.name}"`);
        continue;
      }

      // Priority 2: match by name (case-insensitive, trim)
      const byName = localBranches.find(
        (lb) =>
          lb.name.toLowerCase().trim() === ab.name.toLowerCase().trim() &&
          !lb.accurateBranchId
      );

      if (byName) {
        await prisma.branch.update({
          where: { id: byName.id },
          data:  {
            accurateBranchId: ab.accurateBranchId,
            lastSyncAt:       new Date(),
          },
        });
        // Update local cache so subsequent items in the loop don't re-match the same row
        byName.accurateBranchId = ab.accurateBranchId;

        matched++;
        results.push({
          accurateBranchId: ab.accurateBranchId,
          name:             ab.name,
          localId:          byName.id,
          status:           "matched",
        });
        logger.info(
          `[branch sync] matched "${ab.name}" (accurateId=${ab.accurateBranchId}) → local id=${byName.id}`
        );
      } else {
        unmatched++;
        results.push({
          accurateBranchId: ab.accurateBranchId,
          name:             ab.name,
          status:           "unmatched",
          hint:             "Create a local branch with the same name, then re-sync",
        });
        logger.warn(
          `[branch sync] no local branch found for Accurate branch "${ab.name}" (id=${ab.accurateBranchId})`
        );
      }
    } catch (err) {
      failed++;
      logger.error(
        `[branch sync] error for Accurate branch id=${ab.accurateBranchId}`,
        err.message
      );
      results.push({
        accurateBranchId: ab.accurateBranchId,
        name:             ab.name,
        status:           "failed",
        error:            err.message,
      });
    }
  }

  logger.info(
    `[branch sync] done — total=${accurateBranches.length} matched=${matched} unmatched=${unmatched} failed=${failed}`
  );

  return { total: accurateBranches.length, matched, unmatched, failed, results };
};

// ── Manual branch mapping (admin maps local branch → Accurate branch) ─

const mapBranchToAccurate = async (localBranchId, accurateBranchId) => {
  const branch = await prisma.branch.findUnique({ where: { id: localBranchId } });
  if (!branch) throw new AppError("Branch not found", StatusCodes.NOT_FOUND);

  // Guard: accurateBranchId must not be already used by another local branch
  const conflict = await prisma.branch.findUnique({
    where: { accurateBranchId },
  });
  if (conflict && conflict.id !== localBranchId) {
    throw new AppError(
      `Accurate branch ID ${accurateBranchId} sudah dipakai oleh cabang "${conflict.name}"`,
      StatusCodes.CONFLICT
    );
  }

  return prisma.branch.update({
    where: { id: localBranchId },
    data:  { accurateBranchId, lastSyncAt: new Date() },
  });
};

module.exports = { syncBranchesFromAccurate, mapBranchToAccurate };
