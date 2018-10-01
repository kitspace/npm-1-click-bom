var {retailer_list, maxPartNumbers} = require('./line_data')
var xlsx = require('xlsx')

var headings = [
  {reference: 'References'},
  {quantity: 'Qty'},
  {description: 'Description'},
  {partNumbers: 'Part Number'}
]

function write(lines, options) {
  let tsv = writeTSV(lines)
  // js-xslx gets confused by quote marks in TSV
  // https://github.com/SheetJS/js-xlsx/issues/825, we don't use non-content
  // quote marks for TSV so we just escape all the quote marks
  tsv = tsv.replace(/"/g, '""')
  const x = xlsx.read(tsv, {type: 'string'})

  return xlsx.write(x, options)
}

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
exports.write = write
