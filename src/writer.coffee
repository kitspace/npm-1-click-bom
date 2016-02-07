{retailer_list} = require './line_data'

exports.writeTSV = (lines) ->

    r = 'References\tQuantity'

    partsLengths = []
    for line in lines
        partsLengths.push(line.partNumbers.length)

    maxParts = Math.max.apply(null, partsLengths)

    if maxParts < 1
        maxParts = 1

    for _ in [1..maxParts]
        r += '\tPart Number'

    r += '\tDescription'

    for retailer in retailer_list
        r += "\t#{retailer}"
    r += '\n'

    for line in lines
        r += "#{line.reference}"
        r += "\t#{line.quantity}"
        for i in [1..maxParts]
            r += '\t'
            if line.partNumbers[i - 1]?
                r += line.partNumbers[i - 1]
        r += "\t#{line.description}"
        for retailer in retailer_list
            if line.retailers[retailer]?
                r += "\t#{line.retailers[retailer]}"
            else
                r += '\t'
        r += '\n'
    return r
