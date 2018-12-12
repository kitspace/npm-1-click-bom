var expect = require('chai').expect
var oneClickBom = require('../lib/main')
parseTSV = oneClickBom.parseTSV
writeTSV = oneClickBom.writeTSV
var stripQuotes = require('../lib/parser').stripQuotes

describe('parseTSV', function() {
  it('catches negative quantities', function() {
    var result = parseTSV('References\tQty\tFarnell\ntest\t-1\t898989')
    expect(result.warnings.length).to.equal(1)
  })

  it('replaces dashes', function() {
    var result = parseTSV('References\tQty\tFarnell\ntest\t1\t8-98-989')
    expect(result.lines[0].retailers.Farnell).to.equal('898989')
  })

  it('replaces dashes 2', function() {
    var result = oneClickBom.parse('References\tQty\tRS\ntest\t1\t8-98-989')
    expect(result.lines[0].retailers.RS).to.equal('898989')
  })

  it("doesn't leave things undefined", function() {
    var result = parseTSV('References\tQty\tFarnell\ntest\t1\t898989')
    expect(result.lines[0].description).to.equal('')
    expect(result.warnings.length).to.equal(0)
    expect(result.invalid.length).to.equal(0)
  })

  it('can handle \\r\\n line endings', function() {
    var result = parseTSV('References\tQty\tFarnell\r\ntest\t1\t898989\r\n')
    expect(result.lines[0].retailers.Farnell).to.equal('898989')
  })

  it("doesn't replace dashes for Digikey", function() {
    var result = parseTSV('References\tQty\tDigikey\ntest\t1\t8-98-989')
    expect(result.lines[0].retailers.Digikey).to.equal('8-98-989')
  })

  it('trims whitespace', function() {
    var result = parseTSV(
      'References\tQty\tPart Number\tDigikey\tFarnell\n test \t1\t part number \t 898989 \n'
    )
    expect(result.lines[0].retailers.Digikey).to.equal('898989')
    expect(result.lines[0].partNumbers[0].part).to.equal('part number')
    expect(result.lines[0].reference).to.equal('test')
  })

  it('understands aliases', function() {
    var result = parseTSV(
      'Parts\tquantity\tMfg_Part_No\tDigi-key\tElement14\n test \t1\t part number \t 898989 \n'
    )
    expect(result.warnings.length).to.equal(0)
    expect(result.errors).to.equal(undefined)
    expect(result.lines[0].retailers.Digikey).to.equal('898989')
    expect(result.lines[0].partNumbers[0].part).to.equal('part number')
    expect(result.lines[0].reference).to.equal('test')
  })

  it('adds manufacturer to part number', function() {
    var result = parseTSV(
      'References\tQty\tManufacturer\tPart Number\ntest\t1\tman\tmpn1'
    )
    expect(result.lines[0].partNumbers[0].manufacturer).to.equal('man')
    expect(result.lines[0].partNumbers[0].part).to.equal('mpn1')
  })

  it('handles multiple part numbers', function() {
    var result = parseTSV(
      'References\tQty\tPart Number\tPart Number\ntest\t1\tmpn1\tmpn2'
    )
    expect(result.lines[0].partNumbers[0].manufacturer).to.deep.equal('')
    expect(result.lines[0].partNumbers[1].manufacturer).to.deep.equal('')
    expect(result.lines[0].partNumbers[0].part).to.deep.equal('mpn1')
    expect(result.lines[0].partNumbers[1].part).to.deep.equal('mpn2')
  })

  it('strips quotes', function() {
    var result = parseTSV(
      'References\tQty\tPart Number\tPart Number\n"test"\t"1"\t\'mpn\'\t'
    )
    expect(result.lines[0].reference).to.equal('test')
    expect(result.lines[0].quantity).to.equal(1)
    expect(result.lines[0].partNumbers[0].part).to.equal('mpn')
  })

  it('keeps track of line numbers', function() {
    var result = parseTSV(
      'References\tQty\tPart Number\ntest1\t1\tmpn\ntest2\t1\tmpn\n'
    )
    expect(result.lines[0].row).to.equal(1)
    expect(result.lines[1].row).to.equal(2)
  })

  it('handles retailer column', () => {
    const result = parseTSV(
      'References\tQty\tRetailer\tPart No.\ntest1\t1\tFEC\tpart1\ntest2\t2\tMouser\tpart2\n'
    )
    expect(result.lines[0].retailers.Farnell).to.equal('part1')
    expect(result.lines[1].retailers.Mouser).to.equal('part2')
  })

  it('replaces dashes in retailer column', () => {
    const result = parseTSV(
      'References\tQty\tRetailer\tPart No.\ntest1\t1\tFEC\txxx-yyy\ntest2\t2\tMouser\tx-y-x-y\n'
    )
    expect(result.lines[0].retailers.Farnell).to.equal('xxxyyy')
    expect(result.lines[1].retailers.Mouser).to.equal('xyxy')
  })

  it('always returns an invalid array', () => {
    var result = parseTSV('References\tQty\tFarnell\ntest\t-1\t898989')
    expect(result.invalid.length).to.equal(0)
  })

  it('handles do not fit column', () => {
    let result = parseTSV('References\tQty\tFarnell\tDNF\ntest\t1\t898989\tDNF')
    expect(result.lines.length).to.equal(0)
    result = parseTSV('References\tQty\tFarnell\tDNS\ntest\t1\t898989\ttrue')
    expect(result.lines.length).to.equal(0)
    result = parseTSV(
      'References\tQty\tFarnell\tDo not fit\ntest\t1\t898989\tfitted\ntest\t1\t898989\tnot fitted'
    )
    expect(result.lines.length).to.equal(1)
    result = parseTSV(
      'References\tQty\tFarnell\tDNF\ntest\t1\t898989\ttrue\ntest\t1\t898989\ttrue'
    )
    expect(result.lines.length).to.equal(0)
  })

  it('handles fitted column', () => {
    let result = parseTSV(
      'References\tQty\tFarnell\tFitted\ntest\t1\t898989\ttrue\ntest2\t2\t318787\tDNF'
    )
    expect(result.lines.length).to.equal(1)
    result = parseTSV(
      'References\tQty\tFarnell\tFitted\ntest\t1\t898989\tFitted\ntest2\t2\t318787\tNot Fitted'
    )
    expect(result.lines.length).to.equal(1)
  })

  it("doesn't get confused about quotes in tsv", function() {
    var result = parseTSV(
      'References\tQty\tDescription\tFarnell\ntest\t1\t0.1" header\t898989\n'
    )
    expect(result.lines[0].retailers.Farnell).to.equal('898989')
  })

  it('always has a reference', function() {
    var result = parseTSV(
      'References\tQty\tDescription\tDigikey\tMouser\tRS\tNewark\tFarnell\tRapid\n\t1\t\t\t\t\t\t\t\n'
    )
    expect(result.lines[0].reference).to.equal('')
  })

  it('pulls more things into description', () => {
    const result = parseTSV(
      'Value\tVoltage\tPower\tFootprint\tRef\tqty\nvalue\tvoltage\tpower\tfootprint\ttest\t1'
    )
    expect(result.lines[0].description).to.equal(
      'value voltage power footprint'
    )
  })

  it("doesn't get confused by commas in the line", () => {
    const result = parseTSV(
      'References\tQty\tDescription\tMPN\n,,,,,,\t1\t\ttest\n'
    )
    expect(result.lines[0].reference).to.equal(',,,,,,')
  })
  it("doesn't get confused by commas in the line 2", () => {
    const result = parseTSV(
      'ref\tqty\tdigikey\nR137, R138, R205, R206, R207, R220, R221,R122,R55\t1\t296-1411-5-ND'
    )
    expect(result.lines[0].reference).to.equal(
      'R137, R138, R205, R206, R207, R220, R221,R122,R55'
    )
  })
})

describe('stripQuotes', function() {
  it('strips double-quote', () => expect(stripQuotes('"a"')).to.equal('a'))
  it('strips single-quote', () => expect(stripQuotes("'a'")).to.equal('a'))
})

describe('writeTSV', () =>
  it('writes out multiple part numbers', function() {
    var test_string =
      'References\tQty\tDescription\tManufacturer\tMPN\tManufacturer\tMPN'
    for (var retailer of oneClickBom.getRetailers()) {
      test_string += `\t${retailer}`
    }
    test_string += '\ntest\t1\tdescr\tmanuf1\tmpn1\tmanuf2\tmpn2'
    for (var _ of oneClickBom.getRetailers()) {
      test_string += '\t'
    }
    test_string += '\n'
    var result = parseTSV(test_string)
    expect(writeTSV(result.lines)).to.equal(test_string)
  }))

describe('oneClickBom.numberOfEmpty', function() {
  it('counts retailers as empty fields', function() {
    var result = parseTSV('References\tQty\tPart Number\ntest\t1\tmpn1\n')
    expect(oneClickBom.numberOfEmpty(result.lines)).to.equal(
      oneClickBom.getRetailers().length
    )
  })

  it('counts empty part numbers as empty fields', function() {
    var result = parseTSV('References\tQty\tFarnell\ntest\t1\t898989\n')
    expect(oneClickBom.numberOfEmpty(result.lines)).to.equal(
      oneClickBom.getRetailers().length
    )
  })

  it("doesn't count extra part numbers as empty fields", function() {
    var result = parseTSV(
      'References\tQty\tFarnell\tPart\tPart\ntest\t1\t898989\t\t\n'
    )
    expect(oneClickBom.numberOfEmpty(result.lines)).to.equal(
      oneClickBom.getRetailers().length
    )
  })
})

describe('oneClickBom.hasSKUs', function() {
  it('returns false on empty', function() {
    expect(oneClickBom.hasSKUs([])).to.equal(false)
  })
  it('returns false with no skus', function() {
    const lines = [
      {
        retailers: oneClickBom.getEmptyRetailers()
      },
      {
        retailers: oneClickBom.getEmptyRetailers()
      }
    ]
    expect(oneClickBom.hasSKUs(lines)).to.equal(false)
  })
  it('returns true when there is an sku', function() {
    const retailers = oneClickBom.getEmptyRetailers()
    retailers.Newark = 'x'
    const lines = [
      {
        retailers
      },
      {
        retailers: oneClickBom.getEmptyRetailers()
      }
    ]
    expect(oneClickBom.hasSKUs(lines)).to.equal(true)
  })
})

describe('oneClickBom.merge', () => {
  it('increases quantity on identical merge', function() {
    var result = parseTSV('References\tQty\tPart Number\ntest\t1\tmpn1\n')
    var lines1 = JSON.parse(JSON.stringify(result.lines))
    result = parseTSV('References\tQty\tPart Number\ntest\t1\tmpn1\n')
    var lines2 = JSON.parse(JSON.stringify(result.lines))
    var merged = oneClickBom.merge(lines1, lines2)
    return expect(merged[0][0].quantity).to.equal(2)
  })
})

describe('oneClickBom.maxPartNumbers', () => {
  it('returns maximum number of MPNs per line in lines', () => {
    var result = parseTSV(
      'References\tQty\tPart Number\tPart Number\ntest\t1\tmpn1\tmpn2\ntest2\ntest2\t1\tmpn1\t\t\n'
    )
    var max = oneClickBom.maxPartNumbers(result.lines)
    expect(max).to.equal(2)
  })
})

describe('oneClickBom.toRetailers', () => {
  it('extracts retailers', () => {
    const lines = [
      {
        retailers: {
          Digikey: '',
          Mouser: '',
          RS: '',
          Newark: '',
          Farnell: ''
        }
      },
      {
        retailers: {
          Digikey: '',
          Mouser: '',
          RS: '',
          Newark: '',
          Farnell: ''
        }
      }
    ]
    const result = oneClickBom.toRetailers(lines)
    expect(result.Digikey.length).to.equal(2)
    expect(result.Mouser.length).to.equal(2)
    expect(result.RS.length).to.equal(2)
    expect(result.Newark.length).to.equal(2)
    expect(result.Farnell.length).to.equal(2)
    expect(result.Digikey[0]).to.equal('')
    expect(result.Digikey[1]).to.equal('')
    expect(result.Mouser[0]).to.equal('')
    expect(result.Mouser[1]).to.equal('')
    expect(result.RS[0]).to.equal('')
    expect(result.RS[1]).to.equal('')
    expect(result.Newark[0]).to.equal('')
    expect(result.Newark[1]).to.equal('')
    expect(result.Farnell[0]).to.equal('')
    expect(result.Farnell[1]).to.equal('')
  })
})
