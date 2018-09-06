'use strict';

var xlsx = require('xlsx');
var lineData = require('./line_data');

var headings = {
  'refs?': 'reference',
  'references?': 'reference',
  'line(-| )?notes?': 'reference',
  //not happy about this one but it's an eagle default in bom.ulp
  parts: 'reference',
  'comments?': 'description',
  'descriptions?': 'description',
  'cmnts?': 'description',
  'descrs?': 'description',
  'qn?tys?': 'quantity',
  quantity: 'quantity',
  quantities: 'quantity',
  'quant.?': 'quantity',
  'co?u?nt': 'quantity',
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
  mfpn: 'partNumber',
  'mfg.?part.*': 'partNumber',
  'manufacturers?': 'manufacturer',
  'm/?f': 'manufacturer',
  'manuf\\.?': 'manufacturer',
  Farnell: 'Farnell',
  FEC: 'Farnell',
  Premier: 'Farnell',
  element14: 'Farnell',
  'Digi(-| )?key': 'Digikey',
  Mouser: 'Mouser',
  RS: 'RS',
  'RS(-| )?Online': 'RS',
  'RS(-| )?Delivers': 'RS',
  'Radio(-| )?Spares': 'RS',
  'RS(-| )?Components': 'RS',
  Newark: 'Newark'
};

function parse(text) {
  var warnings = [];
  var x = void 0;
  try {
    x = xlsx.read(text, { type: 'buffer' });
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

function parseTSV(text) {
  return parse(text);
}

function toLines(sheet, warnings) {
  var aoa = sheet_to_aoa(sheet);
  var h = findHeader(aoa);
  if (h < 0) {
    return [];
  }
  var hs = aoa[h].map(function (x) {
    return lookup(x, headings);
  }).map(function (x, i) {
    if (x === 'manufacturer') {
      return 'manufacturer_' + i;
    }
    if (x === 'partNumber') {
      return 'partNumber_' + i;
    }
    return x;
  });
  var lines = xlsx.utils.sheet_to_json(sheet, { header: hs, range: h + 1 });
  lines = lines.map(function (line, i) {
    var newLine = { retailers: {} };
    var manufacturers = [];
    var parts = [];
    for (var key in line) {
      var v = line[key].trim();
      if (lineData.retailer_list.includes(key)) {
        if (key === 'Digikey') {
          newLine.retailers[key] = v;
        } else {
          newLine.retailers[key] = v.replace(/-/g, '');
        }
      } else if (/^manufacturer_/.test(key)) {
        manufacturers.push({ manufacturer: v });
      } else if (/^partNumber_/.test(key)) {
        parts.push({ part: v });
      } else if (key === 'quantity') {
        var q = parseInt(v, 10);
        if (isNaN(q) || q < 1) {
          warnings.push({
            title: 'Invalid quantity',
            message: 'Row ' + i + ' has an invalid quantity: ' + q + '. Defaulting to 1. '
          });
          q = 1;
        }
        newLine.quantity = q;
      } else {
        newLine[key] = line[key];
      }
    }
    newLine.partNumbers = parts.map(function (part, i) {
      return { part: part, manufacturer: manufacturers[i] || '' };
    });
    return newLine;
  });
  return { lines: lines, warnings: warnings };
}

function processLines(line, i) {}

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

function sheet_to_aoa(sheet) {
  return xlsx.utils.sheet_to_json(sheet, { header: 1, range: 0 });
}

exports.parseTSV = parseTSV;
exports.parse = parse;