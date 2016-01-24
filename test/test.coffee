expect = require('chai').expect
{parseTSV} = require('./../lib/main')

describe 'Catches negative quanities', () ->
    {lines, invalid} = parseTSV('References\tQty\tFarnell\ntest\t-1\t898989')
    expect(lines.length).to.equal(0)
    expect(invalid[0].reason).to.equal('Quantity is less than one.')

describe 'Replaces dashes', () ->
    {lines, invalid} = parseTSV('References\tQty\tFarnell\ntest\t1\t8-98-989')
    console.log(lines, invalid)
    expect(lines[0].retailers.Farnell).to.equal('898989')
