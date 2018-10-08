const parseSExpression = require('s-expression')

const {getEmptyLine} = require('./line_data')

module.exports = function kicadPcbToBom(kicad_pcb) {
  const lines = pcb2lines(kicad_pcb)
  const x = mergeLines(lines).map(l => Object.assign(getEmptyLine(), l))
  return x
}

function pcb2lines(kicad_pcb) {
  const s = parseSExpression(kicad_pcb)
  const lines = filterModules(s)
  return lines.map(l => {
    let {reference, description, value, footprint} = l.reduce((prev, attr) => {
      const kw = attr[0]
      if (kw === 'descr' && attr[1]) {
        prev.description = attr[1]
      } else if (kw === 'tags' && prev.description == null && attr[1]) {
        prev.description = attr[1]
      } else if (kw === 'fp_text') {
        if (attr[1] === 'value') {
          prev.value = attr[2]
        } else if (attr[1] === 'reference') {
          prev.reference = attr[2]
        }
      } else if (attr[0] === 'footprint') {
        prev.footprint = attr[1]
      }
      return prev
    }, {})
    if (description == null) {
      const name = footprint.split(':')[1]
      description = name
    }
    description += ' ' + value
    description = description.replace(/_|\n/g, ' ').trim()
    return {reference, description}
  })
}

function mergeLines(unmerged) {
  const {lines} = unmerged.reduce(
    (prev, part) => {
      const index = prev.descriptions.indexOf(part.description)
      if (index >= 0) {
        prev.lines[index].reference += ', ' + part.reference
        prev.lines[index].quantity += 1
      } else {
        part.quantity = 1
        prev.lines.push(part)
        prev.descriptions.push(part.description)
      }
      return prev
    },
    {lines: [], descriptions: []}
  )
  return lines
}

function filterModules(s) {
  return s
    .filter(x => x[0] === 'module')
    .map(x => x.concat([['footprint', x[1]]]))
    .map(x =>
      x.filter(
        y =>
          y[0] === 'footprint' ||
          y[0] === 'descr' ||
          y[0] === 'tags' ||
          y[0] === 'fp_text'
      )
    )
}
