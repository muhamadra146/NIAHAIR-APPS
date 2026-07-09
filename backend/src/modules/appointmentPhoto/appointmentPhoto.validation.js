'use strict';

const { object, string, optional } = require('valibot');

const uploadPhotoSchema = object({
  type:  optional(string()),
  notes: optional(string()),
});

module.exports = { uploadPhotoSchema };
