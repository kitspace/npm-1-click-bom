var {retailer_list, maxPartNumbers} = require('./line_data')

var headings = [
  {reference: 'References'},
  {quantity: 'Qty'},
  {description: 'Description'},
  {partNumbers: 'Part Number'}
]

function writeTSV(lines) {
  var r = 'References\tQty\tDescription'

  var maxParts = maxPartNumbers(lines)

  if (maxParts >= 1) {
    for (var i = 0; i < maxParts; i++) {
      r += '\tManufacturer'
      r += '\tMPN'
    }
  }

  for (var retailer of retailer_list) {
    r += `\t${retailer}`
  }

  r += '\n'

  for (var line of lines) {
    r += `${line.reference || ''}`
    r += `\t${line.quantity}`
    r += `\t${line.description}`
    if (maxParts >= 1) {
      for (var i = 0; i < maxParts; i++) {
        r += '\t'
        if (line.partNumbers[i] != null) {
          r += line.partNumbers[i].manufacturer
          r += '\t'
          r += line.partNumbers[i].part
        } else {
          r += '\t'
        }
      }
    }
    for (retailer of retailer_list) {
      if (line.retailers[retailer] != null) {
        r += `\t${line.retailers[retailer]}`
      } else {
        r += '\t'
      }
    }
    r += '\n'
  }
  return r
}

exports.writeTSV = writeTSV
