'use strict';

const { object, string, number, optional, pipe, minLength, minValue, array } = require('valibot');

const bulkSaveSchema = object({
  rows: array(object({
    treatmentItemId: pipe(string(), minLength(1, 'treatmentItemId is required')),
    id:              optional(string()),
    materialItemId:  optional(string()),
    unitId:          optional(string()),
    qty:             pipe(number(), minValue(0)),
  })),
});

module.exports = { bulkSaveSchema };
