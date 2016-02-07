retailer_list = ['Digikey', 'Mouser', 'RS', 'Newark', 'Farnell']

exports.retailer_list = retailer_list

exports.field_list = ['partNumbers', 'description']

exports.isComplete = (lines) ->
    complete = true
    for line in lines
        for r in exports.retailer_list
            if line.retailers[r] == ''
                complete = false
                break
        if not complete
            break
        for f in exports.field_list
            if line[f] == ''
                complete = false
                break
    return complete


exports.hasSKUs = (lines) ->
    hasSKUs = false
    for line in lines
        for r in exports.retailer_list
            if line.retailers[r] != ''
                hasSKUs = true
                break
        if hasSKUs
            break
    return hasSKUs


exports.numberOfEmpty = (lines) ->
    n = 0
    for line in lines
        if line.partNumbers.length < 1
            n += 1
        for r in exports.retailer_list
            if line.retailers[r] == ''
                n += 1
    return n


exports.merge =  (lines1, lines2) ->
    warnings = []
    duplicates = {}
    merged = lines1
    for line2, index in lines2
        #determine the line-numbers of any duplicates within a single line array
        # as these will be merged too and we should warn about this
        for line2_, index_ in lines2
            if index != index_ and line2.reference == line2_.reference
                d = duplicates[line2.reference]
                if d?
                    #we already have a duplicate registered, push any
                    #non-registered line-numbers
                    if index not in d
                        d.push(index)
                    if index_ not in d
                        d.push(index_)
                else
                     duplicates[line2.reference] = [index, index_]
        exists = false
        for line1 in merged
            if line1.reference == line2.reference
                exists = true
                has_new_parts = false
                for r in retailer_list
                    if line2.retailers[r] != ''
                        if line1.retailers[r] != line2.retailers[r]
                            has_new_parts = true
                        line1.retailers[r] = line2.retailers[r]
                for part in line2.partNumbers
                    if part not in line1.partNumbers
                        has_new_parts = true
                        line1.partNumbers.push(part)
                #if the exact same parts are found, we increase the quantity
                if not has_new_parts
                    line1.quantity += line2.quantity
                break
        if not exists
            merged.push(line2)
    for ref, d of duplicates
        warnings.push(
            title:'Duplicate lines detected'
            message:"You have the exact same reference '#{ref}' on lines
                #{n + 1 for n in d[0..(d.length-2)]} and #{d[d.length-1] + 1}.
                These have been merged"
        )
    return [merged, warnings]
