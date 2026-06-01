const { login, getMe } = require("./auth.service");
const { success } = require("../../common/responses/apiResponse");

const loginController = async (req, res, next) => {
  try {
    const result = await login(req.body);
    return success(res, result, "Login successful");
  } catch (err) {
    next(err);
  }
};

const getMeController = async (req, res, next) => {
  try {
    const result = await getMe(req.user.id);
    return success(res, result, "User fetched");
  } catch (err) {
    next(err);
  }
};

module.exports = { loginController, getMeController };
