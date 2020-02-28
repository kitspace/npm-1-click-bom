const parseSExpression = require('s-expression')
const electroGrammar = require('electro-grammar')

const {getEmptyLine} = require('./line_data')

module.exports = function kicadPcbToBom(kicad_pcb) {
  const lines = pcb2lines(kicad_pcb)
  const x = mergeLines(lines).map(l => Object.assign(getEmptyLine(), l))
  return x
}

function pcb2lines(kicad_pcb) {
  const s = parseSExpression(kicad_pcb)
  const lines = filterModules(s)
  return lines
    .map(l => {
      let {reference, value, footprint, virtual} = l.reduce((prev, attr) => {
        const kw = attr[0]
        if (kw === 'attr' && attr[1] === 'virtual') {
          prev.virtual = true
        }
        if (kw === 'fp_text') {
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
      if (virtual) {
        return null
      }
      const footprint_name = footprint.split(':')[1].replace(/_/g, ' ')
      value = value.replace(/_/g, ' ')
      const description = value + ' ' + footprint_name
      const component = electroGrammar.parse(description, {returnIgnored: true})
      if (component.size) {
        const egValue = component.resistance || component.capacitance
        // ignore if no value, or when the value actually looks like a footprint,
        // or if we got no info from the footprint name
        if (
          egValue &&
          !RegExp(egValue).test(footprint_name) &&
          component.ignored !== footprint_name
        ) {
          return {reference, description: value + ' ' + component.size}
        }
      }
      return {reference, description}
    })
    .filter(x => x)
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
          y[0] === 'fp_text' ||
          y[0] === 'attr'
      )
    )
}
