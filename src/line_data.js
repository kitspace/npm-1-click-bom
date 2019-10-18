'use strict'
const retailer_list = ['LCSC', 'Digikey', 'Mouser', 'RS', 'Newark', 'Farnell']

function getEmptyLine() {
  return {
    reference: '',
    quantity: 0,
    description: '',
    partNumbers: [],
    retailers: getEmptyRetailers()
  }
}

function getRetailers() {
  return retailer_list.slice()
}

function getEmptyRetailers() {
  const r = {}
  retailer_list.forEach(name => {
    r[name] = ''
  })
  return r
}

function isComplete(lines) {
  return exports.numberOfEmpty(lines) === 0
}

function hasSKUs(lines) {
  return lines.reduce(function(prev, line) {
    return retailer_list.reduce(function(prev, r) {
      return prev || line.retailers[r] !== ''
    }, prev)
  }, false)
}

function numberOfEmpty(lines) {
  return lines.reduce(function(prev, line) {
    if (line.partNumbers.length < 1) {
      prev += 1
    }
    return retailer_list.reduce(function(prev, r) {
      if (line.retailers[r] === '') {
        return prev + 1
      }
      return prev
    }, prev)
  }, 0)
}

function maxPartNumbers(lines) {
  return lines.reduce(function(prev, line) {
    return Math.max(prev, line.partNumbers.length)
  }, 0)
}

function toRetailers(lines) {
  const retailers = {}
  retailer_list.forEach(r => {
    retailers[r] = lines.map(l => l.retailers[r])
  })
  return retailers
}

function merge(lines1, lines2) {
  var d
  var warnings = []
  var duplicates = {}
  var merged = lines1
  for (var index = 0; index < lines2.length; index++) {
    //determine the line-numbers of any duplicates within a single line array
    // as these will be merged too and we should warn about this
    var line2 = lines2[index]
    for (var index_ = 0; index_ < lines2.length; index_++) {
      var line2_ = lines2[index_]
      if (index !== index_ && line2.reference === line2_.reference) {
        d = duplicates[line2.reference]
        if (d != null) {
          //we already have a duplicate registered, push any
          //non-registered line-numbers
          if (!d.includes(index)) {
            d.push(index)
          }
          if (!d.includes(index_)) {
            d.push(index_)
          }
        } else {
          duplicates[line2.reference] = [index, index_]
        }
      }
    }
    var exists = false
    for (var line1 of merged) {
      if (line1.reference === line2.reference) {
        exists = true
        var has_new_parts = false
        for (var r of retailer_list) {
          if (line2.retailers[r] !== '') {
            if (line1.retailers[r] !== line2.retailers[r]) {
              has_new_parts = true
            }
            line1.retailers[r] = line2.retailers[r]
          }
        }
        for (var part2 of line2.partNumbers) {
          has_new_parts = !line1.partNumbers.reduce(
            (prev, part1) =>
              (prev || part1.part === part2.part) &&
              part1.manufacturer === part2.manufacturer,
            false
          )
          if (has_new_parts) {
            line1.partNumbers.push(part2)
          }
        }
        //if the exact same parts are found, we increase the quantity
        if (!has_new_parts) {
          line1.quantity += line2.quantity
        }
        break
      }
    }
    if (!exists) {
      merged.push(line2)
    }
  }
  for (var ref in duplicates) {
    d = duplicates[ref]
    warnings.push({
      title: 'Duplicate lines detected',
      message: `You have the exact same reference '${ref}' on lines ${d
        .slice(0, d.length - 2 + 1 || undefined)
        .map(n => n + 1)} and ${d[d.length - 1] + 1}. These have been merged`
    })
  }
  return [merged, warnings]
}

exports.getEmptyLine = getEmptyLine
exports.retailer_list = retailer_list
exports.getRetailers = getRetailers
exports.getEmptyRetailers = getEmptyRetailers
exports.numberOfEmpty = numberOfEmpty
exports.hasSKUs = hasSKUs
exports.merge = merge
exports.maxPartNumbers = maxPartNumbers
exports.toRetailers = toRetailers
exports.isComplete = isComplete
