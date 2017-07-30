var {retailer_list, maxPartNumbers} = require('./line_data')

var headings =
    [ {reference: 'References'}
    , {quantity: 'Qty'}
    , {description: 'Description'}
    , {partNumbers: 'Part Number'}
    ]

exports.writeTSV = function(lines) {

    var r = 'References\tQty\tDescription'

    var maxParts = maxPartNumbers(lines)

    if (maxParts >= 1) {
        for (var _ of __range__(1, maxParts, true)) {
            r += '\tManufacturer'
            r += '\tMPN'
        }
    }

    for (var retailer of retailer_list) {
        r += `\t${retailer}`
    }

    r += '\n'

    for (var line of lines) {
        r += `${line.reference}`
        r += `\t${line.quantity}`
        r += `\t${line.description}`
        if (maxParts >= 1) {
            for (var i of __range__(0, (maxParts - 1), true)) {
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

function __range__(left, right, inclusive) {
  var range = []
  var ascending = left < right
  var end = !inclusive ? right : ascending ? right + 1 : right - 1
  for (var i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i)
  }
  return range
}
