const { success } = require("../../common/responses/apiResponse");
const svc = require("./notification.service");

const listController = async (req, res, next) => {
  try {
    return success(res, await svc.listMine(req.user.id, req.query), "Notifikasi berhasil dimuat");
  } catch (err) { next(err); }
};

const summaryController = async (req, res, next) => {
  try {
    return success(res, await svc.summary(req.user), "Ringkasan notifikasi");
  } catch (err) { next(err); }
};

const markReadController = async (req, res, next) => {
  try {
    await svc.markRead(req.user.id, req.params.id);
    return success(res, null, "Notifikasi ditandai sudah dibaca");
  } catch (err) { next(err); }
};

const markAllReadController = async (req, res, next) => {
  try {
    await svc.markAllRead(req.user.id);
    return success(res, null, "Semua notifikasi ditandai sudah dibaca");
  } catch (err) { next(err); }
};

module.exports = { listController, summaryController, markReadController, markAllReadController };
