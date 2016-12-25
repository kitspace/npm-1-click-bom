let retailer_list = ['Digikey', 'Mouser', 'RS', 'Newark', 'Farnell'];

exports.retailer_list = retailer_list;

exports.field_list = ['partNumbers', 'description'];

exports.isComplete = function(lines) {
    let complete = true;
    for (let line of lines) {
        for (let r of exports.retailer_list) {
            if (line.retailers[r] === '') {
                complete = false;
                break;
            }
        }
        if (line.partNumbers.length < 1) {
            complete = false;
        }
        if (!complete) {
            break;
        }
    }
    return complete;
};


exports.hasSKUs = function(lines) {
    let hasSKUs = false;
    for (let line of lines) {
        for (let r of exports.retailer_list) {
            if (line.retailers[r] !== '') {
                hasSKUs = true;
                break;
            }
        }
        if (hasSKUs) {
            break;
        }
    }
    return hasSKUs;
};


exports.numberOfEmpty = function(lines) {
    let n = 0;
    for (let line of lines) {
        if (line.partNumbers.length < 1) {
            n += 1;
        }
        for (let r of exports.retailer_list) {
            if (line.retailers[r] === '') {
                n += 1;
            }
        }
    }
    return n;
};


exports.merge =  function(lines1, lines2) {
    let d;
    let warnings = [];
    let duplicates = {};
    let merged = lines1;
    for (let index = 0; index < lines2.length; index++) {
        //determine the line-numbers of any duplicates within a single line array
        // as these will be merged too and we should warn about this
        let line2 = lines2[index];
        for (let index_ = 0; index_ < lines2.length; index_++) {
            let line2_ = lines2[index_];
            if (index !== index_ && line2.reference === line2_.reference) {
                d = duplicates[line2.reference];
                if (d != null) {
                    //we already have a duplicate registered, push any
                    //non-registered line-numbers
                    if (!d.includes(index)) {
                        d.push(index);
                    }
                    if (!d.includes(index_)) {
                        d.push(index_);
                    }
                } else {
                     duplicates[line2.reference] = [index, index_];
                 }
            }
        }
        let exists = false;
        for (let line1 of merged) {
            if (line1.reference === line2.reference) {
                exists = true;
                let has_new_parts = false;
                for (let r of retailer_list) {
                    if (line2.retailers[r] !== '') {
                        if (line1.retailers[r] !== line2.retailers[r]) {
                            has_new_parts = true;
                        }
                        line1.retailers[r] = line2.retailers[r];
                    }
                }
                for (var part2 of line2.partNumbers) {
                    has_new_parts = !line1.partNumbers.reduce((prev, part1) => (prev || (part1.part === part2.part)) && (part1.manufacturer === part2.manufacturer)
                    , false);
                    if (has_new_parts) {
                        line1.partNumbers.push(part2);
                    }
                }
                //if the exact same parts are found, we increase the quantity
                if (!has_new_parts) {
                    line1.quantity += line2.quantity;
                }
                break;
            }
        }
        if (!exists) {
            merged.push(line2);
        }
    }
    for (let ref in duplicates) {
        d = duplicates[ref];
        warnings.push({
            title:'Duplicate lines detected',
            message:`You have the exact same reference '${ref}' on lines \
${d.slice(0, (d.length-2) + 1 || undefined).map((n) => n + 1)} and ${d[d.length-1] + 1}. \
These have been merged`
        });
    }
    return [merged, warnings];
};
