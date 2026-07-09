'use strict';

const { object, string, optional, pipe, minLength } = require('valibot');

const upsertSettingSchema = object({
  value:       pipe(string(), minLength(1, 'value is required')),
  description: optional(string()),
});

module.exports = { upsertSettingSchema };
