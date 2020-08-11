// sketched-mermaid to fully-formatted mermaid markdown
// feature: group actors or unique actors (meta block could be for each connection)
// or separate with different files
// unique ids is default > for all?
// feature: filter super-only
// feature: strict-mode to contain order / sequence

const { readFileSync } = require('fs')
const path = require('path')
const crypto = require('crypto')

const filename = 'bat-tauschverhaeltnisse.md'
const filepath = path.resolve(`samples/${filename}`)
const fileContent = readFileSync(filepath).toString()
const slices = fileContent.split('\n').filter(Boolean) // only slices with content
const lastContent = slices.length

const isHeadline = (slice) => {
  if (slice.charAt(0) !== '#') {
    return false
  }
  return true
}

const isComment = (slice) => {
  if (slice.charAt(0) !== '/') {
    return false
  }
  return true
}

const hasRelation = (slice) => {
  if (!slice.includes('>>')) {
    return false
  }
  return true
}

const isSuper = (slice) => {
  if (slice.charAt(0) !== '*') {
    return false
  }
  return true
}

const hasMeta = (file) => {
  if (!file.includes('---')) {
    return false
  }
  return true
}

const splitComponents = (slice) => {
  if (!hasRelation(slice)) {
    return null
  }
  const components = slice
    .split('>>')
    .map((id) => id.trim())
    .filter(Boolean)
  if (components.length !== 3) {
    return null
  }
  return components
}

const componentToObject = (comp) => {
  const [sender, object, receiver] = comp
  return { content: { sender: { label: sender }, object: { label: object }, receiver: { label: receiver } } }
}

const removeBoldFormatting = (string) => {
  const re = /(\*\*|__)(.*?)\1/
  return string.match(re)[2]
}

const removeHeadlineFormatting = (string) => {
  return string.replace('## ', '')
}

const getContentId = (string) => {
  // stackoverflow.com/questions/5878682/node-js-hash-string#comment15839272_11869589
  return crypto.createHash('sha1').update(string).digest('hex').slice(0, 6)
}

const getUniqueContentID = (string) => {
  const randomString = crypto.randomBytes(1).toString('hex')
  const base = getContentId(string)
  return `${base}/${randomString}`
}

const structureCollection = []
const relationsCollection = []

let lastHeadline
let lastHeadlineId
let lastSuper
let lastSuperId

const classifyContent = (content) => {
  if (hasMeta(content)) {
    console.log('hasMeta: true')
    // ToDo: read header, overwrite defaults
  } else {
    console.log('hasMeta: false')
    // ToDo: no header, use defaults
  }
  content.forEach((slice, index) => {
    if (isComment(slice)) {
      return
    }
    if (isHeadline(slice)) {
      lastHeadline = removeHeadlineFormatting(slice)
      lastHeadlineId = getUniqueContentID(lastHeadline)
      const sliceObj = {
        id: lastHeadlineId,
        label: lastHeadline,
        meta: {
          line: index,
          type: "headline",
          mode: "unique", // ToDo
        },
      }
      structureCollection.push(sliceObj)
    }
    if (isSuper(slice)) { // supers should not be unique? > handle current case of doube entries with different lines
      lastSuper = removeBoldFormatting(slice)
      lastSuperId = getUniqueContentID(lastSuper)
      const sliceObj = {
        id: lastSuperId,
        label: lastSuper,
        meta: {
          context: {
            label: lastHeadline,
            id: lastHeadlineId,
          },
          line: index,
          type: "super",
          mode: "unique", // ToDo
        },
      }
      structureCollection.push(sliceObj)
    }
    if (hasRelation(slice) && !isSuper(slice)) {
      const label = slice
      const comps = splitComponents(slice)
      const sliceObj = componentToObject(comps)
      sliceObj.label = label
      sliceObj.id = getUniqueContentID(label)
      sliceObj.content.sender.id = getUniqueContentID(sliceObj.content.sender.label)
      sliceObj.content.object.id = getUniqueContentID(sliceObj.content.object.label)
      sliceObj.content.receiver.id = getUniqueContentID(sliceObj.content.receiver.label)
      sliceObj.meta = {
        context: {
          label: lastSuper,
          id: lastSuperId
        },
        line: index,
        type: 'detail',
        mode: 'unique' // ToDo
      }
      relationsCollection.push(sliceObj)
    }
  })
}

const createBlockIndex = () => {
  const headlines = structureCollection.filter(
    (entry) => entry.meta.type === "headline"
  )
  // HEADLINES
  headlines.forEach((headline) => {
    // ToDo: Handle Multiple Headlines
    console.log(headline)
    const rangeStart = headline.meta.line
    const supers = structureCollection.filter(
      (entry) => entry.meta.type === "super"
    )
    // SUPERS WITHIN EACH HEADLINE
    supers.forEach((candidate) => {
      const superStartRange = candidate.meta.line
      const superEndRangeCandidates = structureCollection.filter(
        (entry) => entry.meta.line > superStartRange + 1
      )
      if (!superEndRangeCandidates.length >= 0) {
        const blockCandidates = relationsCollection.filter(
          (entry) =>
            entry.meta.line > superStartRange
        )
        console.log("blockCandidates:", blockCandidates)
        return
      }
      const superEndRange = superEndRangeCandidates[0].meta.line - 1
      const blockCandidates = relationsCollection.filter(
        (entry) =>
          entry.meta.line > superStartRange && entry.meta.line < superEndRange
      )
      console.log("blockCandidates:", blockCandidates)
      // ToDo: Save IDs of BlockCandidates (with ID of SUPER) 
    })
  })
}


classifyContent(slices)
createBlockIndex()
// ToDo: Write Mermaid Markdown


// Feature: One file, different mermaid blocks
// headline or "super"?
// ```mermaid
// graph TD / LR
// >> graph content
// ```
// Save as .md

// ToDo:
// identify group
