'use strict'
var xlsx = require('xlsx')
var lineData = require('./line_data')

var retailer_aliases = {
    'Farnell'            : 'Farnell',
    'FEC'                : 'Farnell',
    'Premier'            : 'Farnell',
    'element14'          : 'Farnell',
    'Digi(-| )?key'      : 'Digikey',
    'Mouser'             : 'Mouser',
    'RS'                 : 'RS',
    'RS(-| )?Online'     : 'RS',
    'RS(-| )?Delivers'   : 'RS',
    'Radio(-| )?Spares'  : 'RS',
    'RS(-| )?Components' : 'RS',
    'Newark'             : 'Newark'
}

var headings = {
    'refs?'                      : 'reference',
    'references?'                : 'reference',
    'line(-| )?notes?'           : 'reference',
    //not happy about this one but it's an eagle default in bom.ulp
    'parts'                      : 'reference',
    'comments?'                  : 'description',
    'descriptions?'              : 'description',
    'cmnts?'                     : 'description',
    'descrs?'                    : 'description',
    'qn?tys?'                    : 'quantity',
    'quantity'                   : 'quantity',
    'quantities'                 : 'quantity',
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
    'mfpn'                       : 'partNumber',
    'manufacturers?'             : 'manufacturer',
    'm/?f'                       : 'manufacturer',
    'manuf\\.?'                  : 'manufacturer'
}

//a case insensitive match
var lookup = function(name, obj) {
    for (var key in obj) {
        var re = RegExp(key, 'i')
        if (name.match(re)) {
            return obj[key]
        }
    }
    //else
    return null
}

var stripQuotes = function(str) {
    var ret = str
    if (ret[0] === '"' || ret[0] === "'") {
        ret = ret.substr(1)
    }
    var last = ret.length - 1
    if (ret[last] === '"' || ret[last] === "'") {
        ret = ret.substr(0, last)
    }
    return ret
}

var sanitize = function(str) {
    if (!str) {
        return ''
    }
    return stripQuotes(str).trim()
}

var checkValidLines = function(lines_incoming, invalid, warnings) {
    var lines = []
    for (var line of lines_incoming) {
        if (invalid.length > 10) {
            lines = []
            break
        }
        var number = parseInt(line.quantity)
        if (isNaN(number)) {
            invalid.push({row:line.row, reason:'Quantity is not a number.'})
        } else if (number < 1) {
            invalid.push({row:line.row, reason:'Quantity is less than one.'})
        } else {
            line.quantity = number
            for (var key in line.retailers) {
                var v = line.retailers[key]
                if (v == null) {
                    line.retailers[key] = ''
                } else if (key !== 'Digikey') {
                    line.retailers[key] = v.replace(/-/g,'')
                }
            }
            for (var field of lineData.field_list) {
                if (line[field] == null) {
                    line[field] = ''
                }
            }
            lines.push(line)
        }
    }
    return {lines, invalid, warnings}
}

var parseNamed = function(rows, order, retailers) {
    var lines = []
    var invalid = []
    for (var index = 0; index < rows.length; index++) {
        var row = rows[index]
        if (row !== '') {
            var cells = row.split('\t')

            var rs = function() {
                var retailersObj = {}
                for (var r of lineData.retailer_list) {
                    retailersObj[r] = ''
                }
                for (r of retailers) {
                    if (cells[order.indexOf(r)] != null) {
                        retailersObj[`${r}`] = sanitize(cells[order.indexOf(r)])
                    }
                }
                return retailersObj
            }

            var parts = function() {
                var field, i
                var part_list = []
                var part_indexes = []
                var manuf_indexes = []
                for (i = 0; i < order.length; i++) {
                    field = order[i]
                    if (field === 'partNumber') {
                        part_indexes.push(i)
                    }
                }
                for (i = 0; i < order.length; i++) {
                    field = order[i]
                    if (field === 'manufacturer') {
                        manuf_indexes.push(i)
                    }
                }
                for (i = 0; i < part_indexes.length; i++) {
                    var manuf, manuf_index
                    var part_index = part_indexes[i]
                    try { manuf_index = manuf_indexes[i]; } catch (error) {}
                    if (manuf_index != null) {
                        manuf = sanitize(cells[manuf_index])
                    } else {
                        manuf = ''
                    }
                    var part = sanitize(cells[part_index])
                    part_list.push({part, manufacturer:manuf})
                }
                return part_list
            }

            var line = {
                reference    : sanitize(cells[order.indexOf('reference')]),
                quantity     : sanitize(cells[order.indexOf('quantity')]),
                description  : sanitize(cells[order.indexOf('description')]),
                partNumbers  : parts(),
                retailers    : rs(),
                row          : index + 1
            }

            if ((line.reference == null) || line.reference === '') {
                invalid.push({
                    row:line.row,
                    reason: 'Reference is undefined.'
                })
            } else if (line.quantity == null) {
                invalid.push({
                    row:line.row,
                    reason: 'Quantity is undefined.'
                })
            } else {
                lines.push(line)
            }
        }
    }

    return {lines, invalid}
}


var hasNamedColumns = function(cells) {
    for (var cell of cells) {
        if (lookup(cell, headings) != null) {
            return true
        }
    }
    //else
    return false
}


var getOrder = function(cells) {
    var v
    var order = []
    var retailers = []
    var warnings = []

    var possible_names = {}
    for (var k in headings) {
        v = headings[k]
        possible_names[k] = v
    }
    for (k in retailer_aliases) {
        v = retailer_aliases[k]
        possible_names[k] = v
    }

    for (var cell of cells) {
        if (cell === '') {
            //this is an empty column, it happen if you ctrl select several
            //columns in a spreadsheet for example
            order.push('')
        } else {
            var heading = lookup(cell, possible_names)
            var retailer = lookup(cell, retailer_aliases)
            if (retailer != null) {
                retailers.push(retailer)
            }
            if (heading != null) {
                order.push(heading)
            } else {
                warnings.push({
                    title:`Unknown column-heading '${cell}'`,
                    message:`Column ${order.length + 1} was ignored.`
                })
                order.push('')
            }
        }
    }

    return {order, retailers, warnings}
}

function parse(text) {
    var warnings = []
    try {
        var x = xlsx.read(text, {type: 'buffer'})
    } catch (e) {
        return {
            lines   : [],
            invalid : [{row:1, reason: 'Could not parse'}]
        }
    }
    if (x.Sheets.length < 1) {
        return {
            lines   : [],
            invalid : [{row:1, reason: 'No data'}]
        }
    }
    var sheetName = x.SheetNames[0]
    if (x.Sheets.length > 1) {
        warnings.push({
            title: 'Multiple worksheets found in spreadsheet',
            message: `Using ${sheetName} only`
        })
    }
    const tsv = xlsx.utils.sheet_to_csv(x.Sheets[sheetName], {FS: '\t'})
    return parseTSV(tsv)
}

function parseTSV(text, warnings=[]) {
    var warnings = []
    try {
        var x = xlsx.read(text, {type: 'buffer'})
    } catch (e) {
        return {
            lines   : [],
            invalid : [{row:1, reason: 'Could not parse'}]
        }
    }
    if (x.Sheets.length < 1) {
        return {
            lines   : [],
            invalid : [{row:1, reason: 'No data'}]
        }
    }
    var sheetName = x.SheetNames[0]
    if (x.Sheets.length > 1) {
        warnings.push({
            title: 'Multiple worksheets found in spreadsheet',
            message: `Using ${sheetName} only`
        })
    }
    var invalid, lines
    var rows = text.split('\n')
    var firstCells = rows[0].split('\t')
    var l = firstCells.length
    if (l < 2) {
        return {
            lines:[],
            invalid:[{
                row:1,
                reason:"The data doesn't look like tab separated values."
            }
            ]
        }
    } else if (l < 3) {
        return {
            lines:[],
            invalid:[{
                row:1,
                reason:`Only ${l} column${l > 1 ? 's' : ''}. \
At least 3 are required.`
            }
            ]
        }
    }
    var order, reason, retailers
    var result = getOrder(firstCells)
    var order = result.order
    var reason = result.reason
    var retailers = result.retailers
    if (!((order != null) && (retailers != null))) {
        return {
            lines   : [],
            invalid : [{row:1, reason}]
        }
    }
    if (order.indexOf('reference') < 0) {
        return {
            lines   : [],
            invalid : [{row:1, reason:'You need a references column.'}]
        }
    }
    result = parseNamed(rows.slice(1), order, retailers)
    return checkValidLines(result.lines, result.invalid, warnings)
}


exports.parseTSV = parseTSV
exports.parse = parse
exports.stripQuotes = stripQuotes
