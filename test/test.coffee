{expect} = require('chai')
{parseTSV} = require('./../lib/main')
line_data = require('./../lib/line_data')

describe 'parseTSV', () ->
    it 'catches negative quantities', () ->
        {lines, invalid} = parseTSV('References\tQty\tFarnell\ntest\t-1\t898989')
        expect(lines.length).to.equal(0)
        expect(invalid[0].reason).to.equal('Quantity is less than one.')

    it 'replaces dashes', () ->
        {lines, invalid} = parseTSV('References\tQty\tFarnell\ntest\t1\t8-98-989')
        expect(lines[0].retailers.Farnell).to.equal('898989')

    it 'doesn\'t replace dashes for Digikey', () ->
        {lines, invalid} = parseTSV('References\tQty\tDigikey\ntest\t1\t8-98-989')
        expect(lines[0].retailers.Digikey).to.equal('8-98-989')

    it 'handles multiple part numbers', () ->
        {lines, invalid} = parseTSV('References\tQty\tPart\tPart\ntest\t1\tmpn1\tmpn2')
        expect(lines[0].partNumbers).to.deep.equal(['mpn1', 'mpn2'])

describe 'line_data', () ->
    it 'counts retailers as empty fields', () ->
        {lines, invalid} = parseTSV('References\tQty\tPart\ntest\t1\tmpn1\n')
        expect(line_data.numberOfEmpty(lines)).to.equal(line_data.retailer_list.length)

    it 'counts empty part numbers as empty fields', () ->
        {lines, invalid} = parseTSV('References\tQty\tFarnell\ntest\t1\t898989\n')
        expect(line_data.numberOfEmpty(lines)).to.equal(line_data.retailer_list.length)

