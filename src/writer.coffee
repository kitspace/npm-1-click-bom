{retailer_list} = require './line_data'

headings =
    [ {reference: 'References'}
    , {quantity: 'Qty'}
    , {description: 'Description'}
    , {partNumbers: 'Part Number'}
    ]

exports.writeTSV = (lines) ->

    r = 'References\tQty\tDescription'

    partsLengths = []
    for line in lines
        partsLengths.push(line.partNumbers.length)

    maxParts = Math.max.apply(null, partsLengths)

    if maxParts >= 1
        for _ in [1..maxParts]
            r += '\tManufacturer'
            r += '\tMPN'

    for retailer in retailer_list
        r += "\t#{retailer}"

    r += '\n'

    for line in lines
        r += "#{line.reference}"
        r += "\t#{line.quantity}"
        r += "\t#{line.description}"
        if maxParts >= 1
            for i in [0..(maxParts - 1)]
                r += '\t'
                if line.partNumbers[i]?
                    r += line.partNumbers[i].manufacturer
                    r += '\t'
                    r += line.partNumbers[i].part
                else
                    r += '\t'
        for retailer in retailer_list
            if line.retailers[retailer]?
                r += "\t#{line.retailers[retailer]}"
            else
                r += '\t'
        r += '\n'
    return r
