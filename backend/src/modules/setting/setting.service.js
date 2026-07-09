'use strict';

const { findByKey, upsert, findAll } = require('./setting.repository');

const getByKey = async (key) => {
  const setting = await findByKey(key);
  return setting ?? { key, value: null };
};

const upsertSetting = async (key, { value, description }) => {
  return upsert(key, String(value), description);
};

const getAllSettings = () => findAll();

module.exports = { getByKey, upsertSetting, getAllSettings };
