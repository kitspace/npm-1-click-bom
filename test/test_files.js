const oneClickBOM = require('../src/main')
const fs = require('fs')
const path = require('path')
const expect = require('chai').expect

const content = fs.readFileSync(path.join(__dirname, 'example.tsv'), 'utf8')
const {lines} = oneClickBOM.parse(content, true)
const ref = oneClickBOM.writeTSV(lines)

describe('files', () => {
  it('parses tsv', done => {
    fs.readFile(path.join(__dirname, 'example.tsv'), 'utf8', (err, content) => {
      const {lines} = oneClickBOM.parse(content)
      expect(lines.length).to.be.above(0)
      const x = oneClickBOM.writeTSV(lines)
      expect(x).to.equal(ref)
      done()
    })
  })
  it('parses csv', done => {
    fs.readFile(path.join(__dirname, 'example.csv'), 'utf8', (err, content) => {
      const {lines} = oneClickBOM.parse(content)
      expect(lines.length).to.be.above(0)
      const x = oneClickBOM.writeTSV(lines)
      expect(x).to.equal(ref)
      done()
    })
  })
  it('parses ods', done => {
    fs.readFile(path.join(__dirname, 'example.ods'), (err, content) => {
      const {lines} = oneClickBOM.parse(content)
      expect(lines.length).to.be.above(0)
      const x = oneClickBOM.writeTSV(lines)
      expect(x).to.equal(ref)
      done()
    })
  })
  it('parses xlsx', done => {
    fs.readFile(path.join(__dirname, 'example.xlsx'), (err, content) => {
      const {lines} = oneClickBOM.parse(content)
      expect(lines.length).to.be.above(0)
      const x = oneClickBOM.writeTSV(lines)
      expect(x).to.equal(ref)
      done()
    })
  })
  it('parses kicad_pcb', done => {
    fs.readFile(path.join(__dirname, 'example2.kicad_pcb'), (err, content) => {
      const {lines} = oneClickBOM.parse(content, {ext: 'kicad_pcb'})
      expect(lines.length).to.be.above(0)
      const x = oneClickBOM.writeTSV(lines)
      fs.readFile(path.join(__dirname, 'example2.tsv'), (err, contentTsv) => {
        const {lines: refLines} = oneClickBOM.parse(contentTsv)
        const ref = oneClickBOM.writeTSV(refLines)
        expect(x).to.equal(ref)
        done()
      })
    })
  })
  it("doesn't change content for xlsx", done => {
    fs.readFile(path.join(__dirname, 'example.xlsx'), (err, content) => {
      const {lines} = oneClickBOM.parse(content)
      expect(lines.length).to.be.above(0)
      const buf = oneClickBOM.write(lines, {type: 'buffer', bookType: 'xlsx'})
      const r = oneClickBOM.parse(buf)
      const lines2 = r.lines
      const tsv1 = oneClickBOM.writeTSV(lines)
      const tsv2 = oneClickBOM.writeTSV(lines2)
      expect(tsv1).to.equal(tsv2)
      done()
    })
  })
  it("doesn't change content for ods", done => {
    fs.readFile(path.join(__dirname, 'example.ods'), (err, content) => {
      const {lines} = oneClickBOM.parse(content)
      expect(lines.length).to.be.above(0)
      const buf = oneClickBOM.write(lines, {type: 'buffer', bookType: 'ods'})
      const r = oneClickBOM.parse(buf)
      const lines2 = r.lines
      const tsv1 = oneClickBOM.writeTSV(lines)
      const tsv2 = oneClickBOM.writeTSV(lines2)
      expect(tsv1).to.equal(tsv2)
      done()
    })
  })
  it("doesn't change content for csv", done => {
    fs.readFile(path.join(__dirname, 'example.csv'), (err, content) => {
      const {lines} = oneClickBOM.parse(content)
      expect(lines.length).to.be.above(0)
      const buf = oneClickBOM.write(lines, {type: 'buffer', bookType: 'csv'})
      const r = oneClickBOM.parse(buf)
      const lines2 = r.lines
      const tsv1 = oneClickBOM.writeTSV(lines)
      const tsv2 = oneClickBOM.writeTSV(lines2)
      expect(tsv1).to.equal(tsv2)
      done()
    })
  })
})
