'use strict'
const xlsx = require('xlsx')
const fileType = require('./file_type')
const lineData = require('./line_data')
const kicadPcbToBom = require('./kicad_pcb')

const retailerAliases = {
  Farnell: 'Farnell',
  FEC: 'Farnell',
  Premier: 'Farnell',
  element14: 'Farnell',
  'sn-dk': 'Digikey',
  'Digi(-| )?key': 'Digikey',
  Mouser: 'Mouser',
  RS: 'RS',
  'RS(-| )?Online': 'RS',
  'RS(-| )?Delivers': 'RS',
  'Radio(-| )?Spares': 'RS',
  'RS(-| )?Components': 'RS',
  Newark: 'Newark',
  LCSC: 'LCSC'
}

const urlToSkuMap = {
  'mouser\\..*/ProductDetail/(\\d+-.*)\\??': 'Mouser',
  'farnell\\..*/.*/dp/(\\d+)': 'Farnell',
  'element14.com/.*/dp/(\\d+)': 'Farnell',
  'lcsc.com/.*_(C\\d+).html': 'LCSC'
}

// a case insensitive reverse-regex lookup that also return
// the first group match
function lookupWithGroup(name, obj) {
  for (const key in obj) {
    const re = RegExp(key, 'i')
    const m = name.match(re)
    if (m) {
      return [obj[key], m[1]]
    }
  }
  // else
  return [null, null]
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
  'count': 'quantity',
  'cnt': 'quantity',
  'pcs/pcb': 'quantity',
  pn: 'partNumber',
  'part(-| )?numbers?': 'partNumber',
  'm/?f parts?': 'partNumber',
  'manuf\\.? parts?': 'partNumber',
  'mpns?': 'partNumber',
  'm/?f part numbers?': 'partNumber',
  'manuf\\.? part numbers?': 'partNumber',
  'manufacturer parts?': 'partNumber',
  'manufacturer part numbers?': 'partNumber',
  'mfg.part.no': 'partNumber',
  'prts?': 'partNumber',
  'manuf#': 'partNumber',
  'ma?n?fr part.*': 'partNumber',
  'manu\\.? p/?n': 'partNumber',
  mfpn: 'partNumber',
  'mfg.?part.*': 'partNumber',
  'retail\\.? part no\\.?': 'retailerPart',
  'retailer part number': 'retailerPart',
  'suppl\\.? part no\\.?': 'retailerPart',
  'supplier part number': 'retailerPart',
  'supplier part': 'retailerPart',
  'part no\\.?': 'retailerPart',
  'part number\\.?': 'retailerPart',
  'order code': 'retailerPart',
  'retailers?': 'retailer',
  'retail\\.?': 'retailer',
  'suppliers?': 'retailer',
  'suppl\\.?': 'retailer',
  fitted: 'fitted',
  fit: 'fitted',
  stuff: 'fitted',
  'do not fit': 'notFitted',
  'do not stuff': 'notFitted',
  'do not place': 'notFitted',
  dnf: 'notFitted',
  dnp: 'notFitted',
  dns: 'notFitted',
  'values?': 'value',
  'voltages?': 'voltage',
  'volt.?': 'voltage',
  '.*power.*': 'power',
  'footprints?': 'footprint',
  'manufacturers?': 'manufacturer',
  'm/?f': 'manufacturer',
  'manuf\\.?': 'manufacturer',
  'mfg.': 'manufacturer',
  'urls?': 'url',
  'links?': 'url'
}

function parse(input, options = {}) {
  if (options.ext === 'kicad_pcb') {
    if (typeof input === 'object') {
      input = input.toString()
    }
    const lines = kicadPcbToBom(input)
    return {lines, warnings: [], invalid: []}
  }
  if (fileType(input) == null && /\t/.test(input)) {
    const result = parseTSV(input)
    if (result.lines.length > 0) {
      return result
    }
  }
  return read(input)
}

function parseTSV(input) {
  if (typeof input === 'object') {
    input = input.toString()
  }
  // js-xslx gets confused by quote marks in TSV
  // https://github.com/SheetJS/js-xlsx/issues/825, we don't use non-content
  // quote marks for TSV so we just escape all the quote marks
  input = input.replace(/"/g, '""')

  // additionally js-xlsx can interpret a lot of non-quoted commas as CSV input
  // so we quote everything
  input = input
    .split('\n')
    .map(line =>
      line
        .split('\t')
        .map(cell => '"' + cell + '"')
        .join('\t')
    )
    .join('\n')

  return read(input)
}

function read(input) {
  const warnings = []
  let x
  try {
    x = xlsx.read(input, {type: 'buffer'})
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
    warnings.push({
      title: 'No quantity column',
      message: `Infering quantities from comma seperated references`
    })
  }
  if (hs.indexOf('reference') < 0) {
    return {
      lines: [],
      invalid: [{row: 1, reason: 'No references column'}]
    }
  }
  if (hs.length === 1) {
    return {
      lines: [],
      invalid: [{row: 1, reason: 'Only one column found'}]
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
  const newLine = lineData.getEmptyLine()
  newLine.row = i + 1
  const manufacturers = []
  const parts = []
  const retailers = []
  const retailerParts = []
  const doesNotHaveQty = !Object.keys(line).includes('quantity')
  for (const key in line) {
    const v = stripQuotes(line[key].trim())
    if (lineData.retailer_list.indexOf(key) >= 0) {
      newLine.retailers[key] = v
    } else if (/^manufacturer_/.test(key)) {
      manufacturers.push(v)
    } else if (/^partNumber_/.test(key)) {
      parts.push(v)
    } else if (key === 'retailer') {
      retailers.push(lookup(v, retailerAliases))
    } else if (key === 'retailerPart') {
      retailerParts.push(v)
    } else if (key === 'url') {
      const [retailer, part] = lookupWithGroup(v, urlToSkuMap)
      if (retailer != null && part !== null) {
        retailers.push(retailer)
        retailerParts.push(part)
      }
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
    } else if (key === 'reference') {
      newLine.reference = v
      if (doesNotHaveQty) {
        newLine.quantity = v.split(',').filter(x => x).length
      }
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
    if (r !== 'Digikey') {
      part = part.replace(/-/g, '')
    }
    if (r) {
      newLine.retailers[r] = part
    }
  })
  if (newLine.fitted == null) {
    newLine.fitted = true
  }
  if (newLine.description == '') {
    newLine.description += newLine.value ? newLine.value + ' ' : ''
    newLine.description += newLine.voltage ? newLine.voltage + ' ' : ''
    newLine.description += newLine.power ? newLine.power + ' ' : ''
    newLine.description += newLine.footprint ? newLine.footprint + ' ' : ''
    newLine.description = newLine.description.trim()
  }
  delete newLine.value
  delete newLine.voltage
  delete newLine.power
  delete newLine.footprint
  return newLine
}

// finds the first row with the most columns and least empty cells
function findHeader(aoa) {
  const {i} = aoa.reduce(
    (prev, row, i) => {
      const len = row.filter(cell => cell != null).length
      if (prev.len < len) {
        return {i, len}
      }
      return prev
    },
    {i: -1, len: 0}
  )
  return i
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

exports.parseTSV = parseTSV
exports.parse = parse
exports.stripQuotes = stripQuotes
