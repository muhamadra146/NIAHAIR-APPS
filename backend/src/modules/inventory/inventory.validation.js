'use strict';

const { object, number, pipe, integer, minValue, maxValue } = require('valibot');

const closePeriodSchema = object({
  year:  pipe(number(), integer(), minValue(2020)),
  month: pipe(number(), integer(), minValue(1), maxValue(12)),
});

const reopenPeriodSchema = object({
  year:  pipe(number(), integer(), minValue(2020)),
  month: pipe(number(), integer(), minValue(1), maxValue(12)),
});

module.exports = { closePeriodSchema, reopenPeriodSchema };
