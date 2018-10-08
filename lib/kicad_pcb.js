'use strict';

var parseSExpression = require('s-expression');

var _require = require('./line_data'),
    getEmptyLine = _require.getEmptyLine;

module.exports = function kicadPcbToBom(kicad_pcb) {
  var lines = pcb2lines(kicad_pcb);
  var x = mergeLines(lines).map(function (l) {
    return Object.assign(getEmptyLine(), l);
  });
  return x;
};

function pcb2lines(kicad_pcb) {
  var s = parseSExpression(kicad_pcb);
  var lines = filterModules(s);
  return lines.map(function (l) {
    var _l$reduce = l.reduce(function (prev, attr) {
      var kw = attr[0];
      if (kw === 'descr' && attr[1]) {
        prev.description = attr[1];
      } else if (kw === 'tags' && prev.description == null && attr[1]) {
        prev.description = attr[1];
      } else if (kw === 'fp_text') {
        if (attr[1] === 'value') {
          prev.value = attr[2];
        } else if (attr[1] === 'reference') {
          prev.reference = attr[2];
        }
      } else if (attr[0] === 'footprint') {
        prev.footprint = attr[1];
      }
      return prev;
    }, {}),
        reference = _l$reduce.reference,
        description = _l$reduce.description,
        value = _l$reduce.value,
        footprint = _l$reduce.footprint;

    if (description == null) {
      var name = footprint.split(':')[1];
      description = name;
    }
    description += ' ' + value;
    description = description.replace(/_|\n/g, ' ').trim();
    return { reference: reference, description: description };
  });
}

function mergeLines(unmerged) {
  var _unmerged$reduce = unmerged.reduce(function (prev, part) {
    var index = prev.descriptions.indexOf(part.description);
    if (index >= 0) {
      prev.lines[index].reference += ', ' + part.reference;
      prev.lines[index].quantity += 1;
    } else {
      part.quantity = 1;
      prev.lines.push(part);
      prev.descriptions.push(part.description);
    }
    return prev;
  }, { lines: [], descriptions: [] }),
      lines = _unmerged$reduce.lines;

  return lines;
}

function filterModules(s) {
  return s.filter(function (x) {
    return x[0] === 'module';
  }).map(function (x) {
    return x.concat([['footprint', x[1]]]);
  }).map(function (x) {
    return x.filter(function (y) {
      return y[0] === 'footprint' || y[0] === 'descr' || y[0] === 'tags' || y[0] === 'fp_text';
    });
  });
}