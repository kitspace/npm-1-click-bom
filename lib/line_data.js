'use strict';

var retailer_list = ['LCSC', 'Digikey', 'Mouser', 'RS', 'Newark', 'Farnell'];

function getEmptyLine() {
  return {
    reference: '',
    quantity: 0,
    description: '',
    partNumbers: [],
    retailers: getEmptyRetailers()
  };
}

function getRetailers() {
  return retailer_list.slice();
}

function getEmptyRetailers() {
  var r = {};
  retailer_list.forEach(function (name) {
    r[name] = '';
  });
  return r;
}

function isComplete(lines) {
  return exports.numberOfEmpty(lines) === 0;
}

function hasSKUs(lines) {
  return lines.reduce(function (prev, line) {
    return retailer_list.reduce(function (prev, r) {
      return prev || line.retailers[r] !== '';
    }, prev);
  }, false);
}

function numberOfEmpty(lines) {
  return lines.reduce(function (prev, line) {
    if (line.partNumbers.length < 1) {
      prev += 1;
    }
    return retailer_list.reduce(function (prev, r) {
      if (line.retailers[r] === '') {
        return prev + 1;
      }
      return prev;
    }, prev);
  }, 0);
}

function maxPartNumbers(lines) {
  return lines.reduce(function (prev, line) {
    return Math.max(prev, line.partNumbers.length);
  }, 0);
}

function toRetailers(lines) {
  var retailers = {};
  retailer_list.forEach(function (r) {
    retailers[r] = lines.map(function (l) {
      return l.retailers[r];
    });
  });
  return retailers;
}

function merge(lines1, lines2) {
  var d;
  var warnings = [];
  var duplicates = {};
  var merged = lines1;
  for (var index = 0; index < lines2.length; index++) {
    //determine the line-numbers of any duplicates within a single line array
    // as these will be merged too and we should warn about this
    var line2 = lines2[index];
    for (var index_ = 0; index_ < lines2.length; index_++) {
      var line2_ = lines2[index_];
      if (index !== index_ && line2.reference === line2_.reference) {
        d = duplicates[line2.reference];
        if (d != null) {
          //we already have a duplicate registered, push any
          //non-registered line-numbers
          if (!d.includes(index)) {
            d.push(index);
          }
          if (!d.includes(index_)) {
            d.push(index_);
          }
        } else {
          duplicates[line2.reference] = [index, index_];
        }
      }
    }
    var exists = false;
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = merged[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var line1 = _step.value;

        if (line1.reference === line2.reference) {
          exists = true;
          var has_new_parts = false;
          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = undefined;

          try {
            for (var _iterator2 = retailer_list[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              var r = _step2.value;

              if (line2.retailers[r] !== '') {
                if (line1.retailers[r] !== line2.retailers[r]) {
                  has_new_parts = true;
                }
                line1.retailers[r] = line2.retailers[r];
              }
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

          var _iteratorNormalCompletion3 = true;
          var _didIteratorError3 = false;
          var _iteratorError3 = undefined;

          try {
            for (var _iterator3 = line2.partNumbers[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
              var part2 = _step3.value;

              has_new_parts = !line1.partNumbers.reduce(function (prev, part1) {
                return (prev || part1.part === part2.part) && part1.manufacturer === part2.manufacturer;
              }, false);
              if (has_new_parts) {
                line1.partNumbers.push(part2);
              }
            }
            //if the exact same parts are found, we increase the quantity
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

          if (!has_new_parts) {
            line1.quantity += line2.quantity;
          }
          break;
        }
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

    if (!exists) {
      merged.push(line2);
    }
  }
  for (var ref in duplicates) {
    d = duplicates[ref];
    warnings.push({
      title: 'Duplicate lines detected',
      message: 'You have the exact same reference \'' + ref + '\' on lines ' + d.slice(0, d.length - 2 + 1 || undefined).map(function (n) {
        return n + 1;
      }) + ' and ' + (d[d.length - 1] + 1) + '. These have been merged'
    });
  }
  return [merged, warnings];
}

exports.getEmptyLine = getEmptyLine;
exports.retailer_list = retailer_list;
exports.getRetailers = getRetailers;
exports.getEmptyRetailers = getEmptyRetailers;
exports.numberOfEmpty = numberOfEmpty;
exports.hasSKUs = hasSKUs;
exports.merge = merge;
exports.maxPartNumbers = maxPartNumbers;
exports.toRetailers = toRetailers;
exports.isComplete = isComplete;