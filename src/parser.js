'use strict'
const xlsx = require('xlsx')
const lineData = require('./line_data')

const retailerAliases = {
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
  Newark: 'Newark',
  Rapid: 'Rapid',
  'rapid.?online': 'Rapid'
}

const headings = {
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
  'retailers?': 'retailer',
  'retail\\.?': 'retailer',
  'suppliers?': 'retailer',
  'suppl\\.?': 'retailer',
  'retail\\.? part no\\.?': 'retailerPart',
  'retailer part number': 'retailerPart',
  'suppl\\.? part no\\.?': 'retailerPart',
  'supplier part number': 'retailerPart',
  'part no\\.?': 'retailerPart',
  'part number\\.?': 'retailerPart',
  fitted: 'fitted',
  fit: 'fitted',
  stuff: 'fitted',
  'do not fit': 'notFitted',
  'do not stuff': 'notFitted',
  dnf: 'notFitted',
  dns: 'notFitted'
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
    return {
      lines: [],
      invalid: [{row: 1, reason: 'Could not find header'}]
    }
  }
  const hs = aoa[h]
    .map(x => lookup(x, headings) || lookup(x, retailerAliases))
    .map((x, i) => {
      if (x === 'manufacturer') {
        return `manufacturer_${i}`
      }
      if (x === 'partNumber') {
        return `partNumber_${i}`
      }
      return x
    })
  if (hs.indexOf('quantity') < 0) {
    return {
      lines: [],
      invalid: [{row: 1, reason: 'No quantity column'}]
    }
  }
  if (hs.indexOf('reference') < 0) {
    return {
      lines: [],
      invalid: [{row: 1, reason: 'No references column'}]
    }
  }
  if (hs.filter(x => x).length < 3) {
    return {
      lines: [],
      invalid: [
        {
          row: 1,
          reason:
            'You need at least references, quantity and a part number or retailer column'
        }
      ]
    }
  }
  let lines = xlsx.utils.sheet_to_json(sheet, {header: hs, range: h + 1})
  lines = lines
    .map(processLine.bind(null, warnings))
    .filter(l => l.quantity > 0)
    .filter(l => l.fitted)
  return {lines, warnings, invalid: []}
}

function processLine(warnings, line, i) {
  const newLine = {
    row: i + 1,
    retailers: lineData.getEmptyRetailers()
  }
  const manufacturers = []
  const parts = []
  const retailers = []
  const retailerParts = []
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
    } else if (key === 'retailer') {
      retailers.push(lookup(v, retailerAliases))
    } else if (key === 'retailerPart') {
      retailerParts.push(v)
    } else if (key === 'quantity') {
      let q = parseInt(v, 10)
      if (isNaN(q) || q <= 0) {
        warnings.push({
          title: 'Invalid quantity',
          message: `Row ${i} has an invalid quantity: ${v}. Removing this line.`
        })
        q = 0
      }
      newLine.quantity = q
    } else if (key === 'notFitted') {
      newLine.fitted =
        /^0$/.test(v) ||
        /false/i.test(v) ||
        /^fitted$/i.test(v) ||
        /^fit$/i.test(v) ||
        /^stuff$/i.test(v) ||
        /^stuffed$/i.test(v)
    } else if (key === 'fitted') {
      newLine.fitted = !(
        /^0$/i.test(v) ||
        /false/i.test(v) ||
        /not/i.test(v) ||
        /dn(f|s)/i.test(v)
      )
    } else {
      newLine[key] = v
    }
  }
  newLine.partNumbers = parts.map((part, i) => {
    return {part, manufacturer: manufacturers[i] || ''}
  })
  // handle retailer/part columns
  retailerParts.forEach((part, i) => {
    const r = retailers[i]
    if (r) {
      newLine.retailers[r] = part
    }
  })
  if (newLine.fitted == null) {
    newLine.fitted = true
  }
  return newLine
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

function parseTSV(str) {
  // js-xslx gets confused by quote marks in TSV
  // https://github.com/SheetJS/js-xlsx/issues/825, we don't use non-content
  // quote marks for TSV so we just escape all the quote marks

  str = str.replace(/"/g, '""')
  return parse(str)
}

exports.parseTSV = parseTSV
exports.parse = parse
exports.stripQuotes = stripQuotes
