'use strict';

var parseSExpression = require('s-expression');
var electroGrammar = require('electro-grammar');

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
      if (kw === 'attr' && attr[1] === 'virtual') {
        prev.virtual = true;
      }
      if (kw === 'fp_text') {
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
        value = _l$reduce.value,
        footprint = _l$reduce.footprint,
        virtual = _l$reduce.virtual;

    if (virtual) {
      return null;
    }
    if (/:/.test(footprint)) {
      footprint = footprint.split(':')[1];
    }
    footprint = footprint.replace(/_/g, ' ');
    value = value.replace(/_/g, ' ');
    var description = value + ' ' + footprint;
    var component = electroGrammar.parse(description, { returnIgnored: true });
    if (component.size) {
      var egValue = component.resistance || component.capacitance || component.color;
      // ignore if no value, or when the value actually looks like a footprint,
      // or if we got no info from the footprint name
      if (egValue && !RegExp(egValue).test(footprint) && component.ignored !== footprint) {
        return {
          reference: reference,
          description: component.type + ' ' + value + ' ' + component.size
        };
      }
    }
    return { reference: reference, description: description };
  }).filter(function (x) {
    return x;
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
      return y[0] === 'footprint' || y[0] === 'descr' || y[0] === 'tags' || y[0] === 'fp_text' || y[0] === 'attr';
    });
  });
}