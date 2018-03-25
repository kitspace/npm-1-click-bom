const oneClickBOM = require('../src/main')
const fs = require('fs')
const path = require('path')
const expect = require('chai').expect

const content = fs.readFileSync(path.join(__dirname, 'example.tsv'), 'utf8')
const {lines} = oneClickBOM.parseTSV(content, true)
const ref = oneClickBOM.writeTSV(lines)

describe('files', () => {
    it('parses tsv', done => {
        fs.readFile(path.join(__dirname, 'example.tsv'), 'utf8', (err, content) => {
            const {lines} = oneClickBOM.parseTSV(content)
            expect(lines.length).to.be.above(0)
            const x = oneClickBOM.writeTSV(lines)
            expect(x).to.equal(ref)
            done()
        })
    })
    it('parses csv', done => {
        fs.readFile(path.join(__dirname, 'example.csv'), 'utf8', (err, content) => {
            const {lines} = oneClickBOM.parseTSV(content)
            expect(lines.length).to.be.above(0)
            const x = oneClickBOM.writeTSV(lines)
            expect(x).to.equal(ref)
            done()
        })
    })
    it('parses ods', done => {
        fs.readFile(path.join(__dirname, 'example.ods'), (err, content) => {
            const {lines} = oneClickBOM.parseTSV(content)
            expect(lines.length).to.be.above(0)
            const x = oneClickBOM.writeTSV(lines)
            expect(x).to.equal(ref)
            done()
        })
    })
    it('parses xlsx', done => {
        fs.readFile(path.join(__dirname, 'example.xlsx'), (err, content) => {
            const {lines} = oneClickBOM.parseTSV(content)
            expect(lines.length).to.be.above(0)
            const x = oneClickBOM.writeTSV(lines)
            expect(x).to.equal(ref)
            done()
        })
    })
})
