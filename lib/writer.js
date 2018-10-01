'use strict';

var _require = require('./line_data'),
    retailer_list = _require.retailer_list,
    maxPartNumbers = _require.maxPartNumbers;

var headings = [{ reference: 'References' }, { quantity: 'Qty' }, { description: 'Description' }, { partNumbers: 'Part Number' }];

function writeTSV(lines) {
  var r = 'References\tQty\tDescription';

  var maxParts = maxPartNumbers(lines);

  if (maxParts >= 1) {
    for (var i = 0; i < maxParts; i++) {
      r += '\tManufacturer';
      r += '\tMPN';
    }
  }

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = retailer_list[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var retailer = _step.value;

      r += '\t' + retailer;
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  r += '\n';

  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = lines[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var line = _step2.value;

      r += '' + (line.reference || '');
      r += '\t' + line.quantity;
      r += '\t' + line.description;
      if (maxParts >= 1) {
        for (var i = 0; i < maxParts; i++) {
          r += '\t';
          if (line.partNumbers[i] != null) {
            r += line.partNumbers[i].manufacturer;
            r += '\t';
            r += line.partNumbers[i].part;
          } else {
            r += '\t';
          }
        }
      }
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = retailer_list[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          retailer = _step3.value;

          if (line.retailers[retailer] != null) {
            r += '\t' + line.retailers[retailer];
          } else {
            r += '\t';
          }
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }

      r += '\n';
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  return r;
}

exports.writeTSV = writeTSV;