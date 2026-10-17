'use strict';

const { StatusCodes } = require('http-status-codes');
const AppError        = require('../../common/errors/AppError');
const { findByKey, upsert, findAll } = require('./setting.repository');

// Nama kunci setting: huruf kecil, angka, garis bawah; maks 80 karakter (G5-16b)
const KEY_PATTERN = /^[a-z0-9_]{1,80}$/;

const getByKey = async (key) => {
  const setting = await findByKey(key);
  return setting ?? { key, value: null };
};

const upsertSetting = async (key, { value, description }) => {
  if (typeof key !== 'string' || !KEY_PATTERN.test(key)) {
    throw new AppError(
      'Nama kunci setting hanya boleh huruf kecil, angka, dan garis bawah (maks 80 karakter)',
      StatusCodes.BAD_REQUEST,
    );
  }
  return upsert(key, String(value), description);
};

const getAllSettings = () => findAll();

module.exports = { getByKey, upsertSetting, getAllSettings };
