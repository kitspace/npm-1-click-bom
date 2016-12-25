let {retailer_list, field_list} = require('./line_data');

let retailer_aliases = {
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
};

let headings = {
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
    'manufacturers?'             : 'manufacturer',
    'm/?f'                       : 'manufacturer',
    'manuf\\.?'                  : 'manufacturer'
};

//a case insensitive match
let lookup = function(name, obj) {
    for (let key in obj) {
        let re = RegExp(key, 'i');
        if (name.match(re)) {
            return obj[key];
        }
    }
    //else
    return null;
};

let stripQuotes = function(str) {
    let ret = str;
    if (ret[0] === '"' || ret[0] === "'") {
        ret = ret.substr(1);
    }
    let last = ret.length - 1;
    if (ret[last] === '"' || ret[last] === "'") {
        ret = ret.substr(0, last);
    }
    return ret;
};

let sanitize = function(str) {
    if (!str) {
        return '';
    }
    return stripQuotes(str).trim();
};

let checkValidLines = function(lines_incoming, invalid, warnings) {
    let lines = [];
    for (let line of lines_incoming) {
        if (invalid.length > 10) {
            lines = [];
            break;
        }
        let number = parseInt(line.quantity);
        if (isNaN(number)) {
            invalid.push({row:line.row, reason:'Quantity is not a number.'});
        } else if (number < 1) {
            invalid.push({row:line.row, reason:'Quantity is less than one.'});
        } else {
            line.quantity = number;
            for (let key in line.retailers) {
                let v = line.retailers[key];
                if (v == null) {
                    line.retailers[key] = '';
                } else if (key !== 'Digikey') {
                    line.retailers[key] = v.replace(/-/g,'');
                }
            }
            for (let field of field_list) {
                if (line[field] == null) {
                    line[field] = '';
                }
            }
            lines.push(line);
        }
    }
    return {lines, invalid, warnings};
};

let parseNamed = function(rows, order, retailers) {
    let lines = [];
    let invalid = [];
    for (let index = 0; index < rows.length; index++) {
        let row = rows[index];
        if (row !== '') {
            var cells = row.split('\t');

            let rs = function() {
                let retailersObj = {};
                for (var r of retailer_list) {
                    retailersObj[r] = '';
                }
                for (r of retailers) {
                    if (cells[order.indexOf(r)] != null) {
                        retailersObj[`${r}`] = sanitize(cells[order.indexOf(r)]);
                    }
                }
                return retailersObj;
            };

            let parts = function() {
                let field, i;
                let part_list = [];
                let part_indexes = [];
                let manuf_indexes = [];
                for (i = 0; i < order.length; i++) {
                    field = order[i];
                    if (field === 'partNumber') {
                        part_indexes.push(i);
                    }
                }
                for (i = 0; i < order.length; i++) {
                    field = order[i];
                    if (field === 'manufacturer') {
                        manuf_indexes.push(i);
                    }
                }
                for (i = 0; i < part_indexes.length; i++) {
                    var manuf, manuf_index;
                    let part_index = part_indexes[i];
                    try { manuf_index = manuf_indexes[i]; } catch (error) {}
                    if (manuf_index != null) {
                        manuf = sanitize(cells[manuf_index]);
                    } else {
                        manuf = '';
                    }
                    let part = sanitize(cells[part_index]);
                    if ((part != null) && part !== '') {
                        part_list.push({part, manufacturer:manuf});
                    }
                }
                return part_list;
            };

            let line = {
                reference    : sanitize(cells[order.indexOf('reference')]),
                quantity     : sanitize(cells[order.indexOf('quantity')]),
                description  : sanitize(cells[order.indexOf('description')]),
                partNumbers  : parts(),
                retailers    : rs(),
                row          : index + 1
            };

            if ((line.reference == null) || line.reference === '') {
                invalid.push({
                    row:line.row,
                    reason: 'Reference is undefined.'
                });
            } else if (line.quantity == null) {
                invalid.push({
                    row:line.row,
                    reason: 'Quantity is undefined.'
                });
            } else {
                lines.push(line);
            }
        }
    }

    return {lines, invalid};
};


let hasNamedColumns = function(cells) {
    for (let cell of cells) {
        if (lookup(cell, headings) != null) {
            return true;
        }
    }
    //else
    return false;
};


let getOrder = function(cells) {
    let v;
    let order = [];
    let retailers = [];
    let warnings = [];

    let possible_names = {};
    for (var k in headings) {
        v = headings[k];
        possible_names[k] = v;
    }
    for (k in retailer_aliases) {
        v = retailer_aliases[k];
        possible_names[k] = v;
    }

    for (let cell of cells) {
        if (cell === '') {
            //this is an empty column, it happen if you ctrl select several
            //columns in a spreadsheet for example
            order.push('');
        } else {
            let heading = lookup(cell, possible_names);
            let retailer = lookup(cell, retailer_aliases);
            if (retailer != null) {
                retailers.push(retailer);
            }
            if (heading != null) {
                order.push(heading);
            } else {
                warnings.push({
                    title:`Unknown column-heading '${cell}'`,
                    message:`Column ${order.length + 1} was ignored.`
                });
                order.push('');
            }
        }
    }

    return {order, retailers, warnings};
};


let parseTSV = function(text) {
    let invalid, lines;
    let rows = text.split('\n');
    let firstCells = rows[0].split('\t');
    let warnings = [];
    let l = firstCells.length;
    if (l < 2) {
        return {
            lines:[],
            invalid:[{
                row:1,
                reason:"The data doesn't look like tab separated values."
            }
            ]
        };
    } else if (l < 3) {
        return {
            lines:[],
            invalid:[{
                row:1,
                reason:`Only ${l} column${l > 1 ? 's' : ''}. \
At least 3 are required.`
            }
            ]
        };
    }
    if (hasNamedColumns(firstCells)) {
        let order, reason, retailers;
        ({order, retailers, reason, warnings} = getOrder(firstCells));
        if (!((order != null) && (retailers != null))) {
            return {
                lines:[],
                invalid:[{row:1, reason}]
            };
        }
        if (order.indexOf('reference') < 0) {
            return {
                lines:[],
                invalid:[{row:1, reason:'You need a references column.'}]
            };
        }
        ({lines, invalid} = parseNamed(rows.slice(1), order, retailers));
    } else {
        warnings.push({
            title:"You have input data in the legacy format!",
            message:"This format has been disabled please tell us if you do rely on it."
        });
    }
    ({lines, invalid, warnings} = checkValidLines(lines, invalid, warnings));
    return {lines, invalid, warnings};
};


exports.parseTSV = parseTSV;
exports.stripQuotes = stripQuotes;
