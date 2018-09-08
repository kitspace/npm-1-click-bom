'use strict'
const {parse, parseTSV} = require('./parser')
const {writeTSV} = require('./writer')
const {
  getRetailers,
  getEmptyRetailers,
  numberOfEmpty,
  hasSKUs,
  merge,
  maxPartNumbers,
  toRetailers,
  isComplete
} = require('./line_data')

exports.parse = parse
exports.parseTSV = parseTSV
exports.writeTSV = writeTSV
exports.getRetailers = getRetailers
exports.getEmptyRetailers = getEmptyRetailers
exports.numberOfEmpty = numberOfEmpty
exports.hasSKUs = hasSKUs
exports.merge = merge
exports.maxPartNumbers = maxPartNumbers
exports.toRetailers = toRetailers
exports.isComplete = isComplete
