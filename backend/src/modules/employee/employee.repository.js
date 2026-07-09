const prisma = require("../../config/prisma");

const INCLUDE = {
  role:       { select: { id: true, code: true, name: true } },
  homeBranch: { select: { id: true, code: true, name: true } },
  employeeBranches: {
    where:   { isActive: true },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    include: { branch: { select: { id: true, code: true, name: true } } },
  },
};

const findAll = ({ skip, take, where, orderBy }) =>
  prisma.employee.findMany({ skip, take, where, orderBy: orderBy ?? { createdAt: "desc" }, include: INCLUDE });

const count = (where) => prisma.employee.count({ where });

const findById = (id) =>
  prisma.employee.findUnique({ where: { id }, include: INCLUDE });

const findByEmployeeCode = (employeeCode) =>
  prisma.employee.findUnique({ where: { employeeCode } });

const findLastEmployeeCode = () =>
  prisma.employee.findFirst({
    where:   { employeeCode: { startsWith: "EMP" } },
    orderBy: { employeeCode: "desc" },
    select:  { employeeCode: true },
  });

const findByEmail = (email) =>
  prisma.employee.findUnique({ where: { email } });

const findRoleById = (id) =>
  prisma.employeeRole.findUnique({ where: { id }, select: { id: true } });

const create = (data) => {
  const { roleId, homeBranchId, ...rest } = data;
  return prisma.employee.create({
    data: {
      ...rest,
      role: { connect: { id: roleId } },
      ...(homeBranchId && { homeBranch: { connect: { id: homeBranchId } } }),
    },
    include: INCLUDE,
  });
};

const update = (id, data) => {
  const { roleId, homeBranchId, ...rest } = data;

  let homeBranchWrite;
  if (homeBranchId)          homeBranchWrite = { connect: { id: homeBranchId } };
  else if (homeBranchId === null) homeBranchWrite = { disconnect: true };

  return prisma.employee.update({
    where: { id },
    data: {
      ...rest,
      ...(roleId        && { role:       { connect: { id: roleId } } }),
      ...(homeBranchWrite && { homeBranch: homeBranchWrite }),
    },
    include: INCLUDE,
  });
};

const updateBranches = (employeeId, branchIds) =>
  prisma.$transaction(async (tx) => {
    await tx.employeeBranch.deleteMany({ where: { employeeId } });
    if (branchIds.length > 0) {
      await tx.employeeBranch.createMany({
        data: branchIds.map((branchId, index) => ({
          employeeId,
          branchId,
          isPrimary: index === 0,
          isActive:  true,
        })),
      });
    }
    return tx.employee.findUnique({ where: { id: employeeId }, include: INCLUDE });
  });

const updateFiles = (id, data) =>
  prisma.employee.update({ where: { id }, data, include: INCLUDE });

const softDelete = (id) =>
  prisma.employee.update({ where: { id }, data: { isActive: false } });

const hardDelete = (id) =>
  prisma.$transaction(async (tx) => {
    // Null-out optional foreign keys that reference this employee
    await tx.appointment.updateMany({
      where: { createdByEmployeeId: id },
      data:  { createdByEmployeeId: null },
    });
    await tx.deposit.updateMany({
      where: { createdByEmployeeId: id },
      data:  { createdByEmployeeId: null },
    });
    await tx.invoice.updateMany({
      where: { createdByEmployeeId: id },
      data:  { createdByEmployeeId: null },
    });
    await tx.payment.updateMany({
      where: { createdByEmployeeId: id },
      data:  { createdByEmployeeId: null },
    });
    await tx.clientConsultationNote.updateMany({
      where: { filledByEmployeeId: id },
      data:  { filledByEmployeeId: null },
    });
    await tx.inventoryMovement.updateMany({
      where: { createdByEmployeeId: id },
      data:  { createdByEmployeeId: null },
    });
    await tx.inventoryPeriod.updateMany({
      where: { closedByEmployeeId: id },
      data:  { closedByEmployeeId: null },
    });

    // Delete required-FK child records in correct order
    await tx.commission.deleteMany({ where: { employeeId: id } });
    await tx.attendanceCorrectionRequest.deleteMany({ where: { employeeId: id } });
    await tx.attendance.deleteMany({ where: { employeeId: id } });
    await tx.staffSchedule.deleteMany({ where: { employeeId: id } });
    await tx.permissionRequest.deleteMany({ where: { employeeId: id } });
    await tx.sickLeave.deleteMany({ where: { employeeId: id } });
    await tx.treatmentAssignment.deleteMany({ where: { employeeId: id } });
    await tx.appointmentStaff.deleteMany({ where: { employeeId: id } });
    await tx.overtimeChargeEmployee.deleteMany({ where: { employeeId: id } });
    await tx.branchCommissionRule.deleteMany({ where: { employeeId: id } });
    await tx.commissionRule.deleteMany({ where: { employeeId: id } });
    await tx.loanRepayment.deleteMany({ where: { loan: { employeeId: id } } });
    await tx.loan.deleteMany({ where: { employeeId: id } });
    await tx.payrollItem.deleteMany({ where: { payroll: { employeeId: id } } });
    await tx.payroll.deleteMany({ where: { employeeId: id } });
    await tx.leaveQuota.deleteMany({ where: { employeeId: id } });
    await tx.leave.deleteMany({ where: { employeeId: id } });
    await tx.employeeSchedule.deleteMany({ where: { employeeId: id } });
    await tx.employeeSalarySettings.deleteMany({ where: { employeeId: id } });
    await tx.employeeBranchHistory.deleteMany({ where: { employeeId: id } });
    await tx.employeeBranch.deleteMany({ where: { employeeId: id } });
    await tx.user.deleteMany({ where: { employeeId: id } });

    await tx.employee.delete({ where: { id } });
  });

module.exports = {
  findAll, count, findById,
  findByEmployeeCode, findLastEmployeeCode, findByEmail,
  findRoleById,
  create, update, updateFiles, updateBranches, softDelete, hardDelete,
};
