// Hanya Owner, Super Admin, atau manager divisi yang boleh membuka daftar persetujuan
// dan menyetujui/menolak pengajuan. Batas staf mana yang boleh diurus dicek di service.
const { StatusCodes } = require("http-status-codes");
const AppError = require("../common/errors/AppError");
const access = require("../modules/division/division.access");

const requireApprover = async (req, res, next) => {
  try {
    const scope = await access.getScope(req.user);
    if (!access.isApprover(scope)) {
      return next(new AppError("Hanya manager divisi, Owner, atau Super Admin yang dapat melakukan ini.", StatusCodes.FORBIDDEN));
    }
    req.accessScope = scope;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = requireApprover;
