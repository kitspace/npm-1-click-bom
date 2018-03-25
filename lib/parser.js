'use strict';

var xlsx = require('xlsx');
var lineData = require('./line_data');

var retailer_aliases = {
    'Farnell': 'Farnell',
    'FEC': 'Farnell',
    'Premier': 'Farnell',
    'element14': 'Farnell',
    'Digi(-| )?key': 'Digikey',
    'Mouser': 'Mouser',
    'RS': 'RS',
    'RS(-| )?Online': 'RS',
    'RS(-| )?Delivers': 'RS',
    'Radio(-| )?Spares': 'RS',
    'RS(-| )?Components': 'RS',
    'Newark': 'Newark'
};

var headings = {
    'refs?': 'reference',
    'references?': 'reference',
    'line(-| )?notes?': 'reference',
    //not happy about this one but it's an eagle default in bom.ulp
    'parts': 'reference',
    'comments?': 'description',
    'descriptions?': 'description',
    'cmnts?': 'description',
    'descrs?': 'description',
    'qn?tys?': 'quantity',
    'quantity': 'quantity',
    'quantities': 'quantity',
    'quant.?': 'quantity',
    'part(-| )?numbers?': 'partNumber',
    'm/?f parts?': 'partNumber',
    'manuf\\.? parts?': 'partNumber',
    'mpns?': 'partNumber',
    'm/?f part numbers?': 'partNumber',
    'manuf\\.? part numbers?': 'partNumber',
    'manufacturer parts?': 'partNumber',
    'manufacturer part numbers?': 'partNumber',
    'prts?': 'partNumber',
    'manuf#': 'partNumber',
    'ma?n?fr part.*': 'partNumber',
    'mfpn': 'partNumber',
    'manufacturers?': 'manufacturer',
    'm/?f': 'manufacturer',
    'manuf\\.?': 'manufacturer'

    //a case insensitive match
};var lookup = function lookup(name, obj) {
    for (var key in obj) {
        var re = RegExp(key, 'i');
        if (name.match(re)) {
            return obj[key];
        }
    }
    //else
    return null;
};

var stripQuotes = function stripQuotes(str) {
    var ret = str;
    if (ret[0] === '"' || ret[0] === "'") {
        ret = ret.substr(1);
    }
    var last = ret.length - 1;
    if (ret[last] === '"' || ret[last] === "'") {
        ret = ret.substr(0, last);
    }
    return ret;
};

var sanitize = function sanitize(str) {
    if (!str) {
        return '';
    }
    return stripQuotes(str).trim();
};

var checkValidLines = function checkValidLines(lines_incoming, invalid, warnings) {
    var lines = [];
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = lines_incoming[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var line = _step.value;

            if (invalid.length > 10) {
                lines = [];
                break;
            }
            var number = parseInt(line.quantity);
            if (isNaN(number)) {
                invalid.push({ row: line.row, reason: 'Quantity is not a number.' });
            } else if (number < 1) {
                invalid.push({ row: line.row, reason: 'Quantity is less than one.' });
            } else {
                line.quantity = number;
                for (var key in line.retailers) {
                    var v = line.retailers[key];
                    if (v == null) {
                        line.retailers[key] = '';
                    } else if (key !== 'Digikey') {
                        line.retailers[key] = v.replace(/-/g, '');
                    }
                }
                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = lineData.field_list[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var field = _step2.value;

                        if (line[field] == null) {
                            line[field] = '';
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

                lines.push(line);
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

    return { lines: lines, invalid: invalid, warnings: warnings };
};

var parseNamed = function parseNamed(rows, order, retailers) {
    var lines = [];
    var invalid = [];
    for (var index = 0; index < rows.length; index++) {
        var row = rows[index];
        if (row !== '') {
            var cells = row.split('\t');

            var rs = function rs() {
                var retailersObj = {};
                var _iteratorNormalCompletion3 = true;
                var _didIteratorError3 = false;
                var _iteratorError3 = undefined;

                try {
                    for (var _iterator3 = lineData.retailer_list[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                        var r = _step3.value;

                        retailersObj[r] = '';
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

                var _iteratorNormalCompletion4 = true;
                var _didIteratorError4 = false;
                var _iteratorError4 = undefined;

                try {
                    for (var _iterator4 = retailers[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                        r = _step4.value;

                        if (cells[order.indexOf(r)] != null) {
                            retailersObj['' + r] = sanitize(cells[order.indexOf(r)]);
                        }
                    }
                } catch (err) {
                    _didIteratorError4 = true;
                    _iteratorError4 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion4 && _iterator4.return) {
                            _iterator4.return();
                        }
                    } finally {
                        if (_didIteratorError4) {
                            throw _iteratorError4;
                        }
                    }
                }

                return retailersObj;
            };

            var parts = function parts() {
                var field, i;
                var part_list = [];
                var part_indexes = [];
                var manuf_indexes = [];
                for (i = 0; i < order.length; i++) {
                    field = order[i];
                    if (field === 'partNumber') {
                        part_indexes.push(i);
                    }
                }
                for (i = 0; i < order.length; i++) {
                    field = order[i];
                    if (field === 'manufacturer') {
                        manuf_indexes.push(i);
                    }
                }
                for (i = 0; i < part_indexes.length; i++) {
                    var manuf, manuf_index;
                    var part_index = part_indexes[i];
                    try {
                        manuf_index = manuf_indexes[i];
                    } catch (error) {}
                    if (manuf_index != null) {
                        manuf = sanitize(cells[manuf_index]);
                    } else {
                        manuf = '';
                    }
                    var part = sanitize(cells[part_index]);
                    part_list.push({ part: part, manufacturer: manuf });
                }
                return part_list;
            };

            var line = {
                reference: sanitize(cells[order.indexOf('reference')]),
                quantity: sanitize(cells[order.indexOf('quantity')]),
                description: sanitize(cells[order.indexOf('description')]),
                partNumbers: parts(),
                retailers: rs(),
                row: index + 1
            };

            if (line.reference == null || line.reference === '') {
                invalid.push({
                    row: line.row,
                    reason: 'Reference is undefined.'
                });
            } else if (line.quantity == null) {
                invalid.push({
                    row: line.row,
                    reason: 'Quantity is undefined.'
                });
            } else {
                lines.push(line);
            }
        }
    }

    return { lines: lines, invalid: invalid };
};

var hasNamedColumns = function hasNamedColumns(cells) {
    var _iteratorNormalCompletion5 = true;
    var _didIteratorError5 = false;
    var _iteratorError5 = undefined;

    try {
        for (var _iterator5 = cells[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            var cell = _step5.value;

            if (lookup(cell, headings) != null) {
                return true;
            }
        }
        //else
    } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion5 && _iterator5.return) {
                _iterator5.return();
            }
        } finally {
            if (_didIteratorError5) {
                throw _iteratorError5;
            }
        }
    }

    return false;
};

var getOrder = function getOrder(cells) {
    var v;
    var order = [];
    var retailers = [];
    var warnings = [];

    var possible_names = {};
    for (var k in headings) {
        v = headings[k];
        possible_names[k] = v;
    }
    for (k in retailer_aliases) {
        v = retailer_aliases[k];
        possible_names[k] = v;
    }

    var _iteratorNormalCompletion6 = true;
    var _didIteratorError6 = false;
    var _iteratorError6 = undefined;

    try {
        for (var _iterator6 = cells[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
            var cell = _step6.value;

            if (cell === '') {
                //this is an empty column, it happen if you ctrl select several
                //columns in a spreadsheet for example
                order.push('');
            } else {
                var heading = lookup(cell, possible_names);
                var retailer = lookup(cell, retailer_aliases);
                if (retailer != null) {
                    retailers.push(retailer);
                }
                if (heading != null) {
                    order.push(heading);
                } else {
                    warnings.push({
                        title: 'Unknown column-heading \'' + cell + '\'',
                        message: 'Column ' + (order.length + 1) + ' was ignored.'
                    });
                    order.push('');
                }
            }
        }
    } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion6 && _iterator6.return) {
                _iterator6.return();
            }
        } finally {
            if (_didIteratorError6) {
                throw _iteratorError6;
            }
        }
    }

    return { order: order, retailers: retailers, warnings: warnings };
};

var parseTSV = function parseTSV(text) {
    var tsv = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    var warnings = [];
    try {
        var x = xlsx.read(text, { type: 'buffer' });
    } catch (e) {
        return {
            lines: [],
            invalid: [{ row: 1, reason: 'Could not parse' }]
        };
    }
    if (x.Sheets.length < 1) {
        return {
            lines: [],
            invalid: [{ row: 1, reason: 'No data' }]
        };
    }
    var sheetName = x.SheetNames[0];
    if (x.Sheets.length > 1) {
        warnings.push({
            title: 'Multiple worksheets found in spreadsheet',
            message: 'Using ' + sheetName + ' only'
        });
    }
    text = xlsx.utils.sheet_to_csv(x.Sheets[sheetName], { FS: '\t' });
    var invalid, lines;
    var rows = text.split('\n');
    var firstCells = rows[0].split('\t');
    var l = firstCells.length;
    if (l < 2) {
        return {
            lines: [],
            invalid: [{
                row: 1,
                reason: "The data doesn't look like tab separated values."
            }]
        };
    } else if (l < 3) {
        return {
            lines: [],
            invalid: [{
                row: 1,
                reason: 'Only ' + l + ' column' + (l > 1 ? 's' : '') + '. At least 3 are required.'
            }]
        };
    }
    var order, reason, retailers;
    var result = getOrder(firstCells);
    var order = result.order;
    var reason = result.reason;
    var retailers = result.retailers;
    if (!(order != null && retailers != null)) {
        return {
            lines: [],
            invalid: [{ row: 1, reason: reason }]
        };
    }
    if (order.indexOf('reference') < 0) {
        return {
            lines: [],
            invalid: [{ row: 1, reason: 'You need a references column.' }]
        };
    }
    result = parseNamed(rows.slice(1), order, retailers);
    return checkValidLines(result.lines, result.invalid, warnings);
};

exports.parseTSV = parseTSV;
exports.stripQuotes = stripQuotes;