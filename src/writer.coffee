{retailer_list} = require './line_data'

exports.writeTSV = (bom) ->
    r = 'References\tQuantity\tManufacturer\tPart Number\tDescription'
    for retailer in retailer_list
        r += "\t#{retailer}"
    r += '\n'
    for line in bom.lines
        r += "#{line.reference}"
        r += "\t#{line.quantity}"
        r += "\t#{line.manufacturer}"
        r += "\t#{line.partNumber}"
        r += "\t#{line.description}"
        for retailer in retailer_list
            if line.retailers[retailer]?
                r += "\t#{line.retailers[retailer]}"
            else
                r += '\t'
        r += '\n'
    return r
