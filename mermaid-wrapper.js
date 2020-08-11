// sketched-mermaid to fully-formatted mermaid markdown
// features: group actors or unique actors (meta block could be for each connection)
// or separate with different files
// unique ids is default

const { readFileSync } = require('fs')
const path = require('path')
const crypto = require('crypto')

const filename = 'bat-tauschverhaeltnisse.md'
const filepath = path.resolve(`samples/${filename}`)
const fileContent = readFileSync(filepath).toString()
const slices = fileContent.split('\n').filter(Boolean)

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
  // ToDo: Return Meta Flags for Mode
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
  return { sender: { name: sender }, object, receiver: { name: receiver } }
}

const removeBoldFormatting = (string) => {
  const re = /(\*\*|__)(.*?)\1/
  return string.match(re)[2]
}

const removeHeadlineFormatting = (string) => {
  return string.replace('## ', '')
}

const getContentId = (string) => {
  return crypto.createHash('sha1').update(string).digest('hex').slice(0, 6)
}

const getUniqueContentID = (string) => {
  const randomString = crypto.randomBytes(1).toString('hex')
  const base = getContentId(string)
  return base + randomString
}

const structureCollection = []
const relationsCollection = []

let lastHeadline
let lastHeadlineId
let lastSuper
let lastSuperId

const classifyContent = (content) => {
  content.forEach((slice, index) => {
    if (isComment(slice)) {
      return
    }
    if (isHeadline(slice)) {
      // console.log(index, slice)
      lastHeadline = removeHeadlineFormatting(slice)
      lastHeadlineId = getContentId(lastHeadline)
      // console.log(lastHeadline)
    }
    if (isSuper(slice)) {
      // console.log(index, slice)
      lastSuper = removeBoldFormatting(slice)
      lastSuperId = getContentId(lastSuper)
      const sliceObj = {
        name: lastSuper,
        meta: {
          context: {
            label: lastHeadline,
            id: lastHeadlineId
          },
          line: index,
          type: 'super',
          mode: 'unique'
        }
      }
      structureCollection.push(sliceObj)
    }
    if (hasRelation(slice) && !isSuper(slice)) {
      const comps = splitComponents(slice)
      const sliceObj = componentToObject(comps)
      // content hash + random for unique + substring
      // stackoverflow.com/questions/5878682/node-js-hash-string#comment15839272_11869589
      sliceObj.sender.id = getContentId(sliceObj.sender.name)
      sliceObj.receiver.id = getContentId(sliceObj.receiver.name)
      sliceObj.meta = {
        context: {
          label: lastSuper,
          id: lastSuperId
        },
        line: index,
        type: 'detail',
        mode: 'unique'
      }
      // console.log(sliceObj)
      relationsCollection.push(sliceObj)
    }
  })
}

classifyContent(slices)
console.log(structureCollection)
// console.log(relationsCollection)
// console.log(slices.length)

// headline or "super"
// ```mermaid
// graph TD / LR
// >> graph content
// ```
// Save as .md

// ToDo:
// identify group
// set uuid for same content
