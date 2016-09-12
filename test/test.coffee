{expect} = require('chai')
{parseTSV, writeTSV} = require('./../src/main')
{stripQuotes} = require('./../src/parser')
line_data = require('./../src/main').lineData

describe 'parseTSV', () ->
    it 'catches negative quantities', () ->
        {lines, invalid} = parseTSV('References\tQty\tFarnell\ntest\t-1\t898989')
        expect(lines.length).to.equal(0)
        expect(invalid[0].reason).to.equal('Quantity is less than one.')

    it 'replaces dashes', () ->
        {lines, invalid} = parseTSV('References\tQty\tFarnell\ntest\t1\t8-98-989')
        expect(lines[0].retailers.Farnell).to.equal('898989')

    it "doesn't replace dashes for Digikey", () ->
        {lines, invalid} = parseTSV('References\tQty\tDigikey\ntest\t1\t8-98-989')
        expect(lines[0].retailers.Digikey).to.equal('8-98-989')

    it 'trims whitespace', () ->
        {lines, invalid} = parseTSV('References\tQty\tPart Number\tDigikey\tFarnell\n test \t1\t part number \t 898989 \t`')
        expect(lines[0].retailers.Digikey).to.equal('898989')
        expect(lines[0].partNumbers[0].part).to.equal('part number')
        expect(lines[0].reference).to.equal('test')

    it 'adds manufacturer to part number', () ->
        {lines, invalid} = parseTSV('References\tQty\tManufacturer\tPart Number\ntest\t1\tman\tmpn1\t`')
        expect(lines[0].partNumbers[0].manufacturer).to.equal('man')
        expect(lines[0].partNumbers[0].part).to.equal('mpn1')

    it 'handles multiple part numbers', () ->
        {lines, invalid} = parseTSV('References\tQty\tPart Number\tPart Number\ntest\t1\tmpn1\tmpn2')
        expect(lines[0].partNumbers[0].manufacturer).to.deep.equal('')
        expect(lines[0].partNumbers[1].manufacturer).to.deep.equal('')
        expect(lines[0].partNumbers[0].part).to.deep.equal('mpn1')
        expect(lines[0].partNumbers[1].part).to.deep.equal('mpn2')

    it "doesn't add empty part numbers", () ->
        {lines, invalid} = parseTSV('References\tQty\tPart Number\tPart Number\ntest\t1\t\t')
        expect(lines[0].partNumbers.length).to.equal(0)

    it "strips quotes", () ->
        {lines, invalid} = parseTSV('References\tQty\tPart Number\tPart Number\n"test"\t"1"\t\'mpn\'\t')
        expect(lines[0].reference).to.equal('test')
        expect(lines[0].quantity).to.equal(1)
        expect(lines[0].partNumbers[0].part).to.equal('mpn')

    it "keep track of line numbers", () ->
        {lines, invalid} = parseTSV('References\tQty\tPart Number\ntest1\t1\tmpn\ntest2\t1\tmpn\n')
        expect(lines[0].row).to.equal(1)
        expect(lines[1].row).to.equal(2)

describe 'stripQuotes', () ->
    it 'strips double-quote', () ->
        expect(stripQuotes('"a"')).to.equal('a')
    it 'strips single-quote', () ->
        expect(stripQuotes("'a'")).to.equal('a')

describe 'writeTSV', () ->
    it 'writes out multiple part numbers', () ->
        test_string = 'References\tQty\tDescription\tManufacturer\tMPN\tManufacturer\tMPN'
        for retailer in line_data.retailer_list
            test_string += '\t' + retailer
        test_string += '\ntest\t1\tdescr\tmanuf1\tmpn1\tmanuf2\tmpn2'
        for _ in line_data.retailer_list
            test_string += '\t'
        test_string += '\n'
        {lines, invalid} = parseTSV(test_string)
        expect(writeTSV(lines)).to.equal(test_string)

describe 'line_data.numberOfEmpty', () ->
    it 'counts retailers as empty fields', () ->
        {lines, invalid} = parseTSV('References\tQty\tPart Number\ntest\t1\tmpn1\n')
        expect(line_data.numberOfEmpty(lines)).to.equal(line_data.retailer_list.length)

    it 'counts empty part numbers as empty fields', () ->
        {lines, invalid} = parseTSV('References\tQty\tFarnell\ntest\t1\t898989\n')
        expect(line_data.numberOfEmpty(lines)).to.equal(line_data.retailer_list.length)

    it "doesn't count extra part numbers as empty fields", () ->
        {lines, invalid} = parseTSV('References\tQty\tFarnell\tPart\tPart\ntest\t1\t898989\t\t\n')
        expect(line_data.numberOfEmpty(lines)).to.equal(line_data.retailer_list.length)

describe 'line_data.merge', () ->
	it 'increases quantity on identical merge', () ->
		{lines} = parseTSV('References\tQty\tPart Number\ntest\t1\tmpn1\n')
		lines1 = JSON.parse(JSON.stringify(lines))
		{lines} = parseTSV('References\tQty\tPart Number\ntest\t1\tmpn1\n')
		lines2 = JSON.parse(JSON.stringify(lines))
		[merged] = line_data.merge(lines1, lines2)
		expect(merged[0].quantity).to.equal(2)
