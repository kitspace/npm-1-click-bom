'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var xlsx = require('xlsx');
var fileType = require('./file_type');
var lineData = require('./line_data');
var kicadPcbToBom = require('./kicad_pcb');

var retailerAliases = {
  Farnell: 'Farnell',
  FEC: 'Farnell',
  Premier: 'Farnell',
  element14: 'Farnell',
  'sn-dk': 'Digikey',
  'Digi(-| )?key': 'Digikey',
  Mouser: 'Mouser',
  RS: 'RS',
  'RS(-| )?Online': 'RS',
  'RS(-| )?Delivers': 'RS',
  'Radio(-| )?Spares': 'RS',
  'RS(-| )?Components': 'RS',
  Newark: 'Newark',
  JLC: 'JLC Assembly',
  'JLC Assembly': 'JLC Assembly',
  LCSC: 'LCSC'
};

var urlToSkuMap = {
  'mouser\\..*/ProductDetail/(.*)\\??': 'Mouser',
  'farnell\\..*/.*/dp/(\\d+)': 'Farnell',
  'element14.com/.*/dp/(\\d+)': 'Farnell',
  'lcsc.com/.*_(C\\d+).html': 'LCSC'

  // a case insensitive reverse-regex lookup that also return
  // the first group match
};function lookupWithGroup(name, obj) {
  for (var key in obj) {
    var re = RegExp(key, 'i');
    var m = name.match(re);
    if (m) {
      return [obj[key], m[1]];
    }
  }
  // else
  return [null, null];
}

//a case insensitive match
function lookup(name, obj) {
  for (var key in obj) {
    var re = RegExp(key, 'i');
    if (name.match(re)) {
      return obj[key];
    }
  }
  //else
  return null;
}

var headings = {
  'refs?': 'reference',
  'references?': 'reference',
  'line(-| )?notes?': 'reference',
  //not happy about this one but it's an eagle default in bom.ulp
  parts: 'reference',
  'designators?': 'reference',
  'comments?': 'description',
  'descriptions?': 'description',
  'cmnts?': 'description',
  'descrs?': 'description',
  'qn?tys?': 'quantity',
  quantity: 'quantity',
  quantities: 'quantity',
  'quant.?': 'quantity',
  'co?u?nt': 'quantity',
  pn: 'partNumber',
  'part(-| )?numbers?': 'partNumber',
  'm/?f parts?': 'partNumber',
  'manuf\\.? parts?': 'partNumber',
  'mpns?': 'partNumber',
  'm/?f part numbers?': 'partNumber',
  'manuf\\.? part numbers?': 'partNumber',
  'manufacturer parts?': 'partNumber',
  'manufacturer part numbers?': 'partNumber',
  'mfg.part.no': 'partNumber',
  'prts?': 'partNumber',
  'manuf#': 'partNumber',
  'ma?n?fr part.*': 'partNumber',
  'manu\\.? p/?n': 'partNumber',
  mfpn: 'partNumber',
  'mfg.?part.*': 'partNumber',
  'retail\\.? part no\\.?': 'retailerPart',
  'retailer part number': 'retailerPart',
  'suppl\\.? part no\\.?': 'retailerPart',
  'supplier part number': 'retailerPart',
  'supplier part': 'retailerPart',
  'part no\\.?': 'retailerPart',
  'part number\\.?': 'retailerPart',
  'order code': 'retailerPart',
  'retailers?': 'retailer',
  'retail\\.?': 'retailer',
  'suppliers?': 'retailer',
  'suppl\\.?': 'retailer',
  fitted: 'fitted',
  fit: 'fitted',
  stuff: 'fitted',
  'do not fit': 'notFitted',
  'do not stuff': 'notFitted',
  'do not place': 'notFitted',
  dnf: 'notFitted',
  dnp: 'notFitted',
  dns: 'notFitted',
  'values?': 'value',
  'voltages?': 'voltage',
  'volt.?': 'voltage',
  '.*power.*': 'power',
  'footprints?': 'footprint',
  'manufacturers?': 'manufacturer',
  'm/?f': 'manufacturer',
  'manuf\\.?': 'manufacturer',
  'mfg.': 'manufacturer',
  'urls?': 'url',
  'links?': 'url'
};

function parse(input) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (options.ext === 'kicad_pcb') {
    if ((typeof input === 'undefined' ? 'undefined' : _typeof(input)) === 'object') {
      input = input.toString();
    }
    var lines = kicadPcbToBom(input);
    return { lines: lines, warnings: [], invalid: [] };
  }
  if (fileType(input) == null && /\t/.test(input)) {
    var result = parseTSV(input);
    if (result.lines.length > 0) {
      return result;
    }
  }
  return read(input);
}

function parseTSV(input) {
  if ((typeof input === 'undefined' ? 'undefined' : _typeof(input)) === 'object') {
    input = input.toString();
  }
  // js-xslx gets confused by quote marks in TSV
  // https://github.com/SheetJS/js-xlsx/issues/825, we don't use non-content
  // quote marks for TSV so we just escape all the quote marks
  input = input.replace(/"/g, '""');

  // additionally js-xlsx can interpret a lot of non-quoted commas as CSV input
  // so we quote everything
  input = input.split('\n').map(function (line) {
    return line.split('\t').map(function (cell) {
      return '"' + cell + '"';
    }).join('\t');
  }).join('\n');

  return read(input);
}

function read(input) {
  var warnings = [];
  var x = void 0;
  try {
    x = xlsx.read(input, { type: 'buffer' });
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
  var sheet = x.Sheets[sheetName];

  return toLines(sheet, warnings);
}

function toLines(sheet, warnings) {
  var aoa = sheet_to_aoa(sheet);
  var h = findHeader(aoa);
  if (h < 0) {
    return {
      lines: [],
      invalid: [{ row: 1, reason: 'Could not find header' }]
    };
  }
  var hs = aoa[h].map(function (x) {
    return lookup(x, headings) || lookup(x, retailerAliases);
  }).map(function (x, i) {
    if (x === 'manufacturer') {
      return 'manufacturer_' + i;
    }
    if (x === 'partNumber') {
      return 'partNumber_' + i;
    }
    return x;
  });
  if (hs.indexOf('quantity') < 0) {
    warnings.push({
      title: 'No quantity column',
      message: 'Infering quantities from comma seperated references'
    });
  }
  if (hs.indexOf('reference') < 0) {
    return {
      lines: [],
      invalid: [{ row: 1, reason: 'No references column' }]
    };
  }
  if (hs.length === 1) {
    return {
      lines: [],
      invalid: [{ row: 1, reason: 'Only one column found' }]
    };
  }
  var lines = xlsx.utils.sheet_to_json(sheet, { header: hs, range: h + 1 });
  lines = lines.map(processLine.bind(null, warnings)).filter(function (l) {
    return l.quantity > 0;
  }).filter(function (l) {
    return l.fitted;
  });
  return { lines: lines, warnings: warnings, invalid: [] };
}

function processLine(warnings, line, i) {
  var newLine = lineData.getEmptyLine();
  newLine.row = i + 1;
  var manufacturers = [];
  var parts = [];
  var retailers = [];
  var retailerParts = [];
  var doesNotHaveQty = !Object.keys(line).includes('quantity');
  for (var key in line) {
    var v = stripQuotes(line[key].trim());
    if (lineData.retailer_list.indexOf(key) >= 0) {
      if (key === 'Digikey') {
        newLine.retailers[key] = v;
      } else {
        newLine.retailers[key] = v.replace(/-/g, '');
      }
    } else if (/^manufacturer_/.test(key)) {
      manufacturers.push(v);
    } else if (/^partNumber_/.test(key)) {
      parts.push(v);
    } else if (key === 'retailer') {
      retailers.push(lookup(v, retailerAliases));
    } else if (key === 'retailerPart') {
      retailerParts.push(v);
    } else if (key === 'url') {
      var _lookupWithGroup = lookupWithGroup(v, urlToSkuMap),
          _lookupWithGroup2 = _slicedToArray(_lookupWithGroup, 2),
          retailer = _lookupWithGroup2[0],
          part = _lookupWithGroup2[1];

      if (retailer != null && part !== null) {
        retailers.push(retailer);
        retailerParts.push(part);
      }
    } else if (key === 'quantity') {
      var q = parseInt(v, 10);
      if (isNaN(q) || q <= 0) {
        warnings.push({
          title: 'Invalid quantity',
          message: 'Row ' + i + ' has an invalid quantity: ' + v + '. Removing this line.'
        });
        q = 0;
      }
      newLine.quantity = q;
    } else if (key === 'notFitted') {
      newLine.fitted = /^0$/.test(v) || /false/i.test(v) || /^fitted$/i.test(v) || /^fit$/i.test(v) || /^stuff$/i.test(v) || /^stuffed$/i.test(v);
    } else if (key === 'fitted') {
      newLine.fitted = !(/^0$/i.test(v) || /false/i.test(v) || /not/i.test(v) || /dn(f|s)/i.test(v));
    } else if (key === 'reference') {
      newLine.reference = v;
      if (doesNotHaveQty) {
        newLine.quantity = v.split(',').filter(function (x) {
          return x;
        }).length;
      }
    } else {
      newLine[key] = v;
    }
  }
  newLine.partNumbers = parts.map(function (part, i) {
    return { part: part, manufacturer: manufacturers[i] || '' };
  });
  // handle retailer/part columns
  retailerParts.forEach(function (part, i) {
    var r = retailers[i];
    if (r !== 'Digikey') {
      part = part.replace(/-/g, '');
    }
    if (r) {
      newLine.retailers[r] = part;
    }
  });
  if (newLine.fitted == null) {
    newLine.fitted = true;
  }
  if (newLine.description == '') {
    newLine.description += newLine.value ? newLine.value + ' ' : '';
    newLine.description += newLine.voltage ? newLine.voltage + ' ' : '';
    newLine.description += newLine.power ? newLine.power + ' ' : '';
    newLine.description += newLine.footprint ? newLine.footprint + ' ' : '';
    newLine.description = newLine.description.trim();
  }
  delete newLine.value;
  delete newLine.voltage;
  delete newLine.power;
  delete newLine.footprint;
  return newLine;
}

//finds the first row with the most columns
function findHeader(aoa) {
  var _aoa$reduce = aoa.reduce(function (prev, row, i) {
    var len = rowLength(row);
    if (prev.len < len) {
      return { i: i, len: len };
    }
    return prev;
  }, { i: -1, len: 0 }),
      i = _aoa$reduce.i;

  return i;
}

function rowLength(row) {
  return row.filter(function (x) {
    return x;
  }).length;
}

function sheet_to_aoa(sheet) {
  return xlsx.utils.sheet_to_json(sheet, { header: 1, range: 0 });
}

function stripQuotes(str) {
  var ret = str;
  if (ret[0] === '"' || ret[0] === "'") {
    ret = ret.substr(1);
  }
  var last = ret.length - 1;
  if (ret[last] === '"' || ret[last] === "'") {
    ret = ret.substr(0, last);
  }
  return ret;
}

exports.parseTSV = parseTSV;
exports.parse = parse;
exports.stripQuotes = stripQuotes;