{retailer_list, field_list} = require('./line_data')

retailer_aliases =
    'Farnell'            : 'Farnell'
    'FEC'                : 'Farnell'
    'Premier'            : 'Farnell'
    'element14'          : 'Farnell'
    'Digi(-| )?key'      : 'Digikey'
    'Mouser'             : 'Mouser'
    'RS'                 : 'RS'
    'RS(-| )?Online'     : 'RS'
    'RS(-| )?Delivers'   : 'RS'
    'Radio(-| )?Spares'  : 'RS'
    'RS(-| )?Components' : 'RS'
    'Newark'             : 'Newark'

headings =
    'refs?'                      : 'reference'
    'references?'                : 'reference'
    'line(-| )?notes?'           : 'reference'
    #not happy about this one but it's an eagle default in bom.ulp
    'parts'                      : 'reference'
    'comments?'                  : 'description'
    'descriptions?'              : 'description'
    'cmnts?'                     : 'description'
    'descrs?'                    : 'description'
    'qn?tys?'                    : 'quantity'
    'quantity'                   : 'quantity'
    'quantities'                 : 'quantity'
    'quant.?'                    : 'quantity'
    'part(-| )?numbers?'         : 'partNumber'
    'm/?f parts?'                : 'partNumber'
    'manuf\\.? parts?'           : 'partNumber'
    'mpns?'                      : 'partNumber'
    'm/?f part numbers?'         : 'partNumber'
    'manuf\\.? part numbers?'    : 'partNumber'
    'manufacturer parts?'        : 'partNumber'
    'manufacturer part numbers?' : 'partNumber'
    'prts?'                      : 'partNumber'
    'manuf#'                     : 'partNumber'
    'manufacturers?'             : 'manufacturer'
    'm/?f'                       : 'manufacturer'
    'manuf\\.?'                  : 'manufacturer'

#a case insensitive match
lookup = (name, obj) ->
    for key of obj
        re = RegExp(key, 'i')
        if name.match(re)
            return obj[key]
    #else
    return null

stripQuotes = (str) ->
    ret = str
    if ret[0] == '"' or ret[0] == "'"
        ret = ret.substr(1)
    last = ret.length - 1
    if ret[last] == '"' or ret[last] == "'"
        ret = ret.substr(0, last)
    return ret

sanitize = (str) ->
    if not str
        return ''
    return stripQuotes(str).trim()

checkValidLines = (lines_incoming, invalid, warnings) ->
    lines = []
    for line in lines_incoming
        if invalid.length > 10
            lines = []
            break
        number = parseInt(line.quantity)
        if isNaN(number)
            invalid.push {row:line.row, reason:'Quantity is not a number.'}
        else if number < 1
            invalid.push {row:line.row, reason:'Quantity is less than one.'}
        else
            line.quantity = number
            for key,v of line.retailers
                if not v?
                    line.retailers[key] = ''
                else if key != 'Digikey'
                    line.retailers[key] = v.replace(/-/g,'')
            for field in field_list
                if not line[field]?
                    line[field] = ''
            lines.push(line)
    return {lines, invalid, warnings}

parseNamed = (rows, order, retailers) ->
    lines = []
    invalid = []
    for row, i in rows
        if row != ''
            cells = row.split('\t')

            rs = () ->
                retailersObj = {}
                for r in retailer_list
                    retailersObj[r] = ''
                for r in retailers
                    if cells[order.indexOf(r)]?
                        retailersObj["#{r}"] = sanitize(cells[order.indexOf(r)])
                return retailersObj

            parts = () ->
                part_list = []
                part_indexes = []
                manuf_indexes = []
                for field,i in order
                    if field == 'partNumber'
                        part_indexes.push(i)
                for field,i in order
                    if field == 'manufacturer'
                        manuf_indexes.push(i)
                for part_index,i in part_indexes
                    try manuf_index = manuf_indexes[i]
                    if manuf_index?
                        manuf = sanitize(cells[manuf_index])
                    else
                        manuf = ''
                    part = sanitize(cells[part_index])
                    if part? and part != ''
                        part_list.push({part:part, manufacturer:manuf})
                return part_list

            line =
                reference    : sanitize(cells[order.indexOf('reference')])
                quantity     : sanitize(cells[order.indexOf('quantity')])
                description  : sanitize(cells[order.indexOf('description')])
                partNumbers  : parts()
                retailers    : rs()
                row          : i + 1

            if not line.reference? or line.reference == ''
                invalid.push
                    row:line.row
                    reason: 'Reference is undefined.'
            else if not line.quantity?
                invalid.push
                    row:line.row
                    reason: 'Quantity is undefined.'
            else
                lines.push(line)

    return {lines, invalid}


hasNamedColumns = (cells) ->
    for cell in cells
        if lookup(cell, headings)?
            return true
    #else
    return false


getOrder = (cells) ->
    order = []
    retailers = []
    warnings = []

    possible_names = {}
    for k,v of headings
        possible_names[k] = v
    for k,v of retailer_aliases
        possible_names[k] = v

    for cell in cells
        if cell == ''
            #this is an empty column, it happen if you ctrl select several
            #columns in a spreadsheet for example
            order.push('')
        else
            heading = lookup(cell, possible_names)
            retailer = lookup(cell, retailer_aliases)
            if retailer?
                retailers.push(retailer)
            if heading?
                order.push(heading)
            else
                warnings.push
                    title:"Unknown column-heading '#{cell}'"
                    message:"Column #{order.length + 1} was ignored."
                order.push('')

    return {order, retailers, warnings}


parseTSV = (text) ->
    rows = text.split('\n')
    firstCells = rows[0].split('\t')
    warnings = []
    l = firstCells.length
    if l < 2
        return {
            lines:[]
            invalid:[
                row:1
                reason:"The data doesn't look like tab separated values."
            ]
        }
    else if l < 3
        return {
            lines:[]
            invalid:[
                row:1
                reason:"Only #{l} column#{if l > 1 then 's' else ''}.
                    At least 3 are required."
            ]
        }
    if hasNamedColumns(firstCells)
        {order, retailers, reason, warnings} = getOrder(firstCells)
        if not (order? && retailers?)
            return {
                lines:[]
                invalid:[{row:1, reason:reason}]
            }
        if order.indexOf('reference') < 0
            return {
                lines:[]
                invalid:[{row:1, reason:'You need a references column.'}]
            }
        {lines, invalid} = parseNamed(rows[1..], order, retailers)
    else
        warnings.push
            title:"You have input data in the legacy format!"
            message:"This format has been disabled please tell us if you do rely on it."
    {lines, invalid, warnings} = checkValidLines(lines, invalid, warnings)
    return {lines, invalid, warnings}


exports.parseTSV = parseTSV
exports.stripQuotes = stripQuotes
