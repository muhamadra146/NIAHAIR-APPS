const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const repo     = require("./salary.repository");

const getByEmployee = async (employeeId) => {
  return repo.findByEmployee(employeeId);
};

const getActive = async (employeeId) => {
  const setting = await repo.findActiveByEmployee(employeeId);
  if (!setting) throw new AppError("No active salary setting found", StatusCodes.NOT_FOUND);
  return setting;
};

const getById = async (id) => {
  const setting = await repo.findById(id);
  if (!setting) throw new AppError("Salary setting not found", StatusCodes.NOT_FOUND);
  return setting;
};

const createSetting = async (body) => {
  const data = {
    employeeId:                  body.employeeId,
    baseSalary:                  body.baseSalary,
    mealAllowancePerDay:         body.mealAllowancePerDay         ?? 0,
    tunjangan:                   body.tunjangan                   ?? 0,
    transportAllowance:          body.transportAllowance          ?? 0,
    overtimeRatePerHour:         body.overtimeRatePerHour         ?? 0,
    holidayRatePerDay:           body.holidayRatePerDay           ?? 0,
    lateDeductionPerMinute:      body.lateDeductionPerMinute      ?? 0,
    absentDeductionPerDay:       body.absentDeductionPerDay       ?? 0,
    earlyLeaveDeductionPerMinute: body.earlyLeaveDeductionPerMinute ?? 0,
    bpjsJhtPercent:              body.bpjsJhtPercent              ?? 2,
    bpjsJhtEmployerPercent:      body.bpjsJhtEmployerPercent      ?? 3.7,
    bpjsJpPercent:               body.bpjsJpPercent               ?? 1,
    bpjsJpEmployerPercent:       body.bpjsJpEmployerPercent       ?? 2,
    bpjsKesehatanEmployeePercent: body.bpjsKesehatanEmployeePercent ?? 1,
    bpjsKesehatanEmployerPercent: body.bpjsKesehatanEmployerPercent ?? 4,
    effectiveDate:               new Date(body.effectiveDate),
    endDate:                     body.endDate ? new Date(body.endDate) : null,
    isActive:                    body.isActive ?? true,
    notes:                       body.notes ?? null,
  };

  const setting = await repo.create(data);

  // Deactivate all other active settings for this employee
  if (setting.isActive) {
    await repo.deactivatePrevious(body.employeeId, setting.id);
  }

  return setting;
};

const updateSetting = async (id, body) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Salary setting not found", StatusCodes.NOT_FOUND);

  const data = {};
  const fields = [
    "baseSalary", "mealAllowancePerDay", "tunjangan", "transportAllowance",
    "overtimeRatePerHour", "holidayRatePerDay", "lateDeductionPerMinute",
    "absentDeductionPerDay", "earlyLeaveDeductionPerMinute",
    "bpjsJhtPercent", "bpjsJhtEmployerPercent",
    "bpjsJpPercent",  "bpjsJpEmployerPercent",
    "bpjsKesehatanEmployeePercent", "bpjsKesehatanEmployerPercent",
    "notes",
  ];
  fields.forEach((f) => { if (body[f] !== undefined) data[f] = body[f]; });

  if (body.effectiveDate !== undefined) data.effectiveDate = new Date(body.effectiveDate);
  if (body.endDate       !== undefined) data.endDate       = body.endDate ? new Date(body.endDate) : null;
  if (body.isActive      !== undefined) data.isActive      = body.isActive;

  const updated = await repo.update(id, data);

  // If activating this setting, deactivate others
  if (data.isActive === true) {
    await repo.deactivatePrevious(existing.employeeId, id);
  }

  return updated;
};

module.exports = { getByEmployee, getActive, getById, createSetting, updateSetting };
