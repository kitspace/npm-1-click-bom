var expect = require('chai').expect;
var oneClickBom = require('../lib/main')
parseTSV = oneClickBom.parseTSV
writeTSV = oneClickBom.writeTSV
var stripQuotes = require('../lib/parser').stripQuotes;
var lineData = require('../lib/main').lineData;

describe('parseTSV', function() {
    it('catches negative quantities', function() {
        var result = parseTSV('References\tQty\tFarnell\ntest\t-1\t898989');
        expect(result.lines.length).to.equal(0);
        return expect(result.invalid[0].reason).to.equal('Quantity is less than one.');
    });

    it('replaces dashes', function() {
        var result = parseTSV('References\tQty\tFarnell\ntest\t1\t8-98-989');
        return expect(result.lines[0].retailers.Farnell).to.equal('898989');
    });

    it("doesn't replace dashes for Digikey", function() {
        var result = parseTSV('References\tQty\tDigikey\ntest\t1\t8-98-989');
        return expect(result.lines[0].retailers.Digikey).to.equal('8-98-989');
    });

    it('trims whitespace', function() {
        var result = parseTSV('References\tQty\tPart Number\tDigikey\tFarnell\n test \t1\t part number \t 898989 \t`');
        expect(result.lines[0].retailers.Digikey).to.equal('898989');
        expect(result.lines[0].partNumbers[0].part).to.equal('part number');
        return expect(result.lines[0].reference).to.equal('test');
    });

    it('adds manufacturer to part number', function() {
        var result = parseTSV('References\tQty\tManufacturer\tPart Number\ntest\t1\tman\tmpn1\t`');
        expect(result.lines[0].partNumbers[0].manufacturer).to.equal('man');
        return expect(result.lines[0].partNumbers[0].part).to.equal('mpn1');
    });

    it('handles multiple part numbers', function() {
        var result = parseTSV('References\tQty\tPart Number\tPart Number\ntest\t1\tmpn1\tmpn2');
        expect(result.lines[0].partNumbers[0].manufacturer).to.deep.equal('');
        expect(result.lines[0].partNumbers[1].manufacturer).to.deep.equal('');
        expect(result.lines[0].partNumbers[0].part).to.deep.equal('mpn1');
        return expect(result.lines[0].partNumbers[1].part).to.deep.equal('mpn2');
    });

    it("doesn't add empty part numbers", function() {
        var result = parseTSV('References\tQty\tPart Number\tPart Number\ntest\t1\t\t');
        return expect(result.lines[0].partNumbers.length).to.equal(0);
    });

    it("strips quotes", function() {
        var result = parseTSV('References\tQty\tPart Number\tPart Number\n"test"\t"1"\t\'mpn\'\t');
        expect(result.lines[0].reference).to.equal('test');
        expect(result.lines[0].quantity).to.equal(1);
        return expect(result.lines[0].partNumbers[0].part).to.equal('mpn');
    });

    return it("keep track of line numbers", function() {
        var result = parseTSV('References\tQty\tPart Number\ntest1\t1\tmpn\ntest2\t1\tmpn\n');
        expect(result.lines[0].row).to.equal(1);
        return expect(result.lines[1].row).to.equal(2);
    });
});

describe('stripQuotes', function() {
    it('strips double-quote', () => expect(stripQuotes('"a"')).to.equal('a'));
    return it('strips single-quote', () => expect(stripQuotes("'a'")).to.equal('a'));
});

describe('writeTSV', () =>
    it('writes out multiple part numbers', function() {
        var test_string = 'References\tQty\tDescription\tManufacturer\tMPN\tManufacturer\tMPN';
        for (var retailer of lineData.retailer_list) {
            test_string += `\t${retailer}`;
        }
        test_string += '\ntest\t1\tdescr\tmanuf1\tmpn1\tmanuf2\tmpn2';
        for (var _ of lineData.retailer_list) {
            test_string += '\t';
        }
        test_string += '\n';
        var result = parseTSV(test_string);
        return expect(writeTSV(result.lines)).to.equal(test_string);
    })
);

describe('lineData.numberOfEmpty', function() {
    it('counts retailers as empty fields', function() {
        var result = parseTSV('References\tQty\tPart Number\ntest\t1\tmpn1\n');
        return expect(lineData.numberOfEmpty(result.lines)).to.equal(lineData.retailer_list.length);
    });

    it('counts empty part numbers as empty fields', function() {
        var result = parseTSV('References\tQty\tFarnell\ntest\t1\t898989\n');
        return expect(lineData.numberOfEmpty(result.lines)).to.equal(lineData.retailer_list.length);
    });

    return it("doesn't count extra part numbers as empty fields", function() {
        var result = parseTSV('References\tQty\tFarnell\tPart\tPart\ntest\t1\t898989\t\t\n');
        return expect(lineData.numberOfEmpty(result.lines)).to.equal(lineData.retailer_list.length);
    });
});

describe('lineData.merge', () =>
	it('increases quantity on identical merge', function() {
		var result = parseTSV('References\tQty\tPart Number\ntest\t1\tmpn1\n');
		var lines1 = JSON.parse(JSON.stringify(result.lines));
		result = parseTSV('References\tQty\tPart Number\ntest\t1\tmpn1\n');
		var lines2 = JSON.parse(JSON.stringify(result.lines));
		var merged = lineData.merge(lines1, lines2);
		return expect(merged[0][0].quantity).to.equal(2);
	})
);