{expect} = require('chai')
{parseTSV} = require('./../lib/main')

describe 'parseTSV', () ->
    it 'catches negative quanities', () ->
        {lines, invalid} = parseTSV('References\tQty\tFarnell\ntest\t-1\t898989')
        expect(lines.length).to.equal(0)
        expect(invalid[0].reason).to.equal('Quantity is less than one.')

    it 'replaces dashes', () ->
        {lines, invalid} = parseTSV('References\tQty\tFarnell\ntest\t1\t8-98-989')
        expect(lines[0].retailers.Farnell).to.equal('898989')

    it 'doesn\'t replace dashes for Digikey', () ->
        {lines, invalid} = parseTSV('References\tQty\tDigikey\ntest\t1\t8-98-989')
        expect(lines[0].retailers.Digikey).to.equal('8-98-989')
