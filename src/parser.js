'use strict'
const xlsx = require('xlsx')
const lineData = require('./line_data')

const retailer_aliases = {
  Farnell              : 'Farnell',
  FEC                  : 'Farnell',
  Premier              : 'Farnell',
  element14            : 'Farnell',
  'Digi(-| )?key'      : 'Digikey',
  Mouser               : 'Mouser',
  RS                   : 'RS',
  'RS(-| )?Online'     : 'RS',
  'RS(-| )?Delivers'   : 'RS',
  'Radio(-| )?Spares'  : 'RS',
  'RS(-| )?Components' : 'RS',
  Newark               : 'Newark'
}

const headings = {
  'refs?'                      : 'reference',
  'references?'                : 'reference',
  'line(-| )?notes?'           : 'reference',
  //not happy about this one but it's an eagle default in bom.ulp
  parts                        : 'reference',
  'comments?'                  : 'description',
  'descriptions?'              : 'description',
  'cmnts?'                     : 'description',
  'descrs?'                    : 'description',
  'qn?tys?'                    : 'quantity',
  quantity                     : 'quantity',
  quantities                   : 'quantity',
  'quant.?'                    : 'quantity',
  'co?u?nt'                    : 'quantity',
  'part(-| )?numbers?'         : 'partNumber',
  'm/?f parts?'                : 'partNumber',
  'manuf\\.? parts?'           : 'partNumber',
  'mpns?'                      : 'partNumber',
  'm/?f part numbers?'         : 'partNumber',
  'manuf\\.? part numbers?'    : 'partNumber',
  'manufacturer parts?'        : 'partNumber',
  'manufacturer part numbers?' : 'partNumber',
  'prts?'                      : 'partNumber',
  'manuf#'                     : 'partNumber',
  'ma?n?fr part.*'             : 'partNumber',
  mfpn                         : 'partNumber',
  'mfg.?part.*'                : 'partNumber',
  'manufacturers?'             : 'manufacturer',
  'm/?f'                       : 'manufacturer',
  'manuf\\.?'                  : 'manufacturer'
}

//a case insensitive match
function lookup(name, obj) {
  for (const key in obj) {
    const re = RegExp(key, 'i')
    if (name.match(re)) {
      return obj[key]
    }
  }
  //else
  return null
}

function stripQuotes(str) {
  const ret = str
  if (ret[0] === '"' || ret[0] === "'") {
    ret = ret.substr(1)
  }
  const last = ret.length - 1
  if (ret[last] === '"' || ret[last] === "'") {
    ret = ret.substr(0, last)
  }
  return ret
}

function sanitize(str) {
  if (!str) {
    return ''
  }
  return stripQuotes(str).trim()
}

function checkValidLines(lines_incoming, invalid, warnings) {
  const lines = []
  for (const line of lines_incoming) {
    if (invalid.length > 10) {
      lines = []
      break
    }
    const number = parseInt(line.quantity)
    if (isNaN(number)) {
      invalid.push({row: line.row, reason: 'Quantity is not a number.'})
    } else if (number < 1) {
      invalid.push({row: line.row, reason: 'Quantity is less than one.'})
    } else {
      line.quantity = number
      for (const key in line.retailers) {
        const v = line.retailers[key]
        if (v == null) {
          line.retailers[key] = ''
        } else if (key !== 'Digikey') {
          line.retailers[key] = v.replace(/-/g, '')
        }
      }
      for (const field of lineData.field_list) {
        if (line[field] == null) {
          line[field] = ''
        }
      }
      lines.push(line)
    }
  }
  return {lines, invalid, warnings}
}

function parseNamed(rows, order, retailers) {
  const lines = []
  const invalid = []
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    if (row !== '') {
      const cells = row.split('\t')

      const rs = function() {
        const retailersObj = {}
        for (const r of lineData.retailer_list) {
          retailersObj[r] = ''
        }
        for (const r of retailers) {
          if (cells[order.indexOf(r)] != null) {
            retailersObj[`${r}`] = sanitize(cells[order.indexOf(r)])
          }
        }
        return retailersObj
      }

      const parts = function() {
        const part_list = []
        const part_indexes = []
        const manuf_indexes = []
        for (let i = 0; i < order.length; i++) {
          const field = order[i]
          if (field === 'partNumber') {
            part_indexes.push(i)
          }
        }
        for (let i = 0; i < order.length; i++) {
          const field = order[i]
          if (field === 'manufacturer') {
            manuf_indexes.push(i)
          }
        }
        for (let i = 0; i < part_indexes.length; i++) {
          let manuf, manuf_index
          const part_index = part_indexes[i]
          try {
            manuf_index = manuf_indexes[i]
          } catch (error) {}
          if (manuf_index != null) {
            manuf = sanitize(cells[manuf_index])
          } else {
            manuf = ''
          }
          const part = sanitize(cells[part_index])
          part_list.push({part, manufacturer: manuf})
        }
        return part_list
      }

      const line = {
        reference: sanitize(cells[order.indexOf('reference')]),
        quantity: sanitize(cells[order.indexOf('quantity')]),
        description: sanitize(cells[order.indexOf('description')]),
        partNumbers: parts(),
        retailers: rs(),
        row: index + 1
      }

      if (line.reference == null || line.reference === '') {
        invalid.push({
          row: line.row,
          reason: 'Reference is undefined.'
        })
      } else if (line.quantity == null) {
        invalid.push({
          row: line.row,
          reason: 'Quantity is undefined.'
        })
      } else {
        lines.push(line)
      }
    }
  }

  return {lines, invalid}
}

function hasNamedColumns(cells) {
  for (const cell of cells) {
    if (lookup(cell, headings) != null) {
      return true
    }
  }
  //else
  return false
}

function getOrder(cells) {
  let v
  const order = []
  const retailers = []
  const warnings = []

  const possible_names = {}
  for (const k in headings) {
    v = headings[k]
    possible_names[k] = v
  }
  for (const k in retailer_aliases) {
    v = retailer_aliases[k]
    possible_names[k] = v
  }

  for (const cell of cells) {
    if (cell === '') {
      //this is an empty column, it happen if you ctrl select several
      //columns in a spreadsheet for example
      order.push('')
    } else {
      const heading = lookup(cell, possible_names)
      const retailer = lookup(cell, retailer_aliases)
      if (retailer != null) {
        retailers.push(retailer)
      }
      if (heading != null) {
        order.push(heading)
      } else {
        warnings.push({
          title: `Unknown column-heading '${cell}'`,
          message: `Column ${order.length + 1} was ignored.`
        })
        order.push('')
      }
    }
  }

  return {order, retailers, warnings}
}

function parse(text) {
  const warnings = []
  let x
  try {
    x = xlsx.read(text, {type: 'buffer'})
  } catch (e) {
    return {
      lines: [],
      invalid: [{row: 1, reason: 'Could not parse'}]
    }
  }
  if (x.Sheets.length < 1) {
    return {
      lines: [],
      invalid: [{row: 1, reason: 'No data'}]
    }
  }
  const sheetName = x.SheetNames[0]
  if (x.Sheets.length > 1) {
    warnings.push({
      title: 'Multiple worksheets found in spreadsheet',
      message: `Using ${sheetName} only`
    })
  }
  const tsv = xlsx.utils.sheet_to_csv(x.Sheets[sheetName], {FS: '\t'})
  return parseTSV(tsv)
}

function parseTSV(text, warnings = []) {
  let invalid, lines
  const rows = text.split('\n')
  const firstCells = rows[0].split('\t')
  const l = firstCells.length
  if (l < 2) {
    return {
      lines: [],
      invalid: [
        {
          row: 1,
          reason: "The data doesn't look like tab separated values."
        }
      ]
    }
  } else if (l < 3) {
    return {
      lines: [],
      invalid: [
        {
          row: 1,
          reason: `Only ${l} column${l > 1 ? 's' : ''}. \
At least 3 are required.`
        }
      ]
    }
  }
  let result = getOrder(firstCells)
  const order = result.order
  const reason = result.reason
  const retailers = result.retailers
  if (!(order != null && retailers != null)) {
    return {
      lines: [],
      invalid: [{row: 1, reason}]
    }
  }
  if (order.indexOf('reference') < 0) {
    return {
      lines: [],
      invalid: [{row: 1, reason: 'You need a references column.'}]
    }
  }
  result = parseNamed(rows.slice(1), order, retailers)
  return checkValidLines(result.lines, result.invalid, warnings)
}

exports.parseTSV = parseTSV
exports.parse = parse
exports.stripQuotes = stripQuotes
