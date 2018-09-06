'use strict'
const xlsx = require('xlsx')
const lineData = require('./line_data')

const headings = {
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
  const sheet = x.Sheets[sheetName]

  return toLines(sheet, warnings)
}

function toLines(sheet, warnings) {
  const aoa = sheet_to_aoa(sheet)
  const h = findHeader(aoa)
  if (h < 0) {
    return []
  }
  const hs = aoa[h].map(x => lookup(x, headings)).map((x, i) => {
    if (x === 'manufacturer') {
      return `manufacturer_${i}`
    }
    if (x === 'partNumber') {
      return `partNumber_${i}`
    }
    return x
  })
  let lines = xlsx.utils.sheet_to_json(sheet, {header: hs, range: h + 1})
  lines = lines.map((line, i) => {
    const newLine = {row: i + 1, retailers: {}}
    const manufacturers = []
    const parts = []
    for (const key in line) {
      const v = stripQuotes(line[key].trim())
      if (lineData.retailer_list.indexOf(key) >= 0) {
        if (key === 'Digikey') {
          newLine.retailers[key] = v
        } else {
          newLine.retailers[key] = v.replace(/-/g, '')
        }
      } else if (/^manufacturer_/.test(key)) {
        manufacturers.push(v)
      } else if (/^partNumber_/.test(key)) {
        parts.push(v)
      } else if (key === 'quantity') {
        let q = parseInt(v, 10)
        if (isNaN(q) || q < 1) {
          warnings.push({
            title: 'Invalid quantity',
            message: `Row ${i} has an invalid quantity: ${q}. Defaulting to 1. `
          })
          q = 1
        }
        newLine.quantity = q
      } else {
        newLine[key] = v
      }
    }
    newLine.partNumbers = parts.map((part, i) => {
      return {part, manufacturer: manufacturers[i] || ''}
    })
    return newLine
  })
  return {lines, warnings}
}

//finds the first row with the most columns
function findHeader(aoa) {
  const {i} = aoa.reduce(
    (prev, row, i) => {
      const len = rowLength(row)
      if (prev.len < len) {
        return {i, len}
      }
      return prev
    },
    {i: -1, len: 0}
  )
  return i
}

function rowLength(row) {
  return row.filter(x => x).length
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

function sheet_to_aoa(sheet) {
  return xlsx.utils.sheet_to_json(sheet, {header: 1, range: 0})
}

function stripQuotes(str) {
  let ret = str
  if (ret[0] === '"' || ret[0] === "'") {
    ret = ret.substr(1)
  }
  const last = ret.length - 1
  if (ret[last] === '"' || ret[last] === "'") {
    ret = ret.substr(0, last)
  }
  return ret
}

exports.parseTSV = parse
exports.parse = parse
exports.stripQuotes = stripQuotes
