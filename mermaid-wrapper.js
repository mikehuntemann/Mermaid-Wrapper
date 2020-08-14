// sketched-mermaid to fully-formatted mermaid markdown
// feature: group actors or unique actors (meta block could be for each connection)
// or separate with different files
// unique ids is default > for all?
// feature: filter super-only ('build summary')
// feature: strict-mode to contain order / sequence

const { readFileSync } = require('fs')
const path = require('path')
const crypto = require('crypto')
const { isDeepStrictEqual } = require('util')

const filename = 'bat-tauschverhaeltnisse.md'
const filepath = path.resolve(`samples/${filename}`)
const fileContent = readFileSync(filepath).toString()
const slices = fileContent.split('\n').filter(Boolean) // only slices with content
const lastContent = slices.length

const isHeadline = (slice) => {
  if (slice.charAt(0) !== '#') {
    return
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
  if (slice.charAt(0) !== '*' || !hasRelation(slice)) {
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
  return {
    content: {
      sender: { label: sender },
      object: { label: object },
      receiver: { label: receiver }
    }
  }
}
const removeFormatting = (type, string) => {
  if (!string || !type) {
    return
  }
  if (type === contentTypes.HEADLINE) {
    return removeHeadlineFormatting(string)
  }
  if (type === contentTypes.SUPER) {
    return removeSuperFormatting(string)
  }
  return string
}

const removeSuperFormatting = (string) => {
  const re = /(\*\*|__)(.*?)\1/
  return string.match(re)[2]
}

const removeHeadlineFormatting = (string) => {
  return string.replace('## ', '')
}

const getContentID = (string, mode = 'UNIQUE') => {
  if (!string) {
    return
  }
  const contentID = crypto
    .createHash('sha1')
    .update(string)
    .digest('hex')
    .slice(0, 6)

  if (mode !== 'UNIQUE') {
    return contentID
  }
  // stackoverflow.com/questions/5878682/node-js-hash-string#comment15839272_11869589
  return makeContentIDUnique(contentID)
}

const makeContentIDUnique = (base) => {
  const randomString = crypto.randomBytes(1).toString('hex')
  return `${base}/${randomString}`
}

const getStartRange = (array, currentIndex) => {
  if (!array || !currentIndex) {
    return
  }
  return array[currentIndex].meta.line
}

const getEndRange = (array, currentIndex) => {
  if (!array || !currentIndex) {
    return
  }
  const nextIndex = currentIndex + 1
  if (array.length <= nextIndex) {
    return lastContent
  }
  return array[nextIndex].meta.line - 1
}

let lastHeadline
let lastHeadlineId
let lastSuper
let lastSuperId

const setObjHistory = (type, label, id) => {
  if (!type || !label || !id) {
    return
  }
  if (type === contentTypes.HEADLINE) {
    lastHeadline = label
    lastHeadlineId = id
  }
  if (type === contentTypes.SUPER) {
    lastSuper = label
    lastSuperId = id
  }
}


const addContextToObject = (obj) => {
  const context = {
    context: {
      label: lastHeadline,
      id: lastHeadlineId
    }
  }
  obj.meta = context
  console.log(obj)
  return obj
}

const createObjectFromString = (type, string, line, mode = 'UNIQUE') => {
  const label = removeFormatting(type, string)
  const id = getContentID(label, mode)
  const obj = {
    label,
    id,
    meta: {
      line,
      type,
      mode
    }
  }
  setObjHistory(type, label, id)
  return obj
}

const getCandidates = (collection, type, startRange, endRange) => {
  if (!collection || !type || !startRange || !endRange) {
    return
  }
  const candidaties = collection.filter(
    (entry) =>
      entry.meta.type === type &&
      entry.meta.line > startRange &&
      entry.meta.line < endRange
  )
  return candidaties
}

const getTypeMatch = (collection, type) => {
  if (!collection || !type) {
    return
  }
  return collection.filter((entry) => entry.meta.type === type)
}

const structureCollection = []
const relationsCollection = []

const contentTypes = {
  COMMENT: 'COMMENT',
  HEADLINE: 'HEADLINE',
  SUPER: 'SUPER',
  DETAIL: 'DETAIL'
}

const getContentType = (string) => {
  if (isComment(string)) {
    return contentTypes.COMMENT
  }
  else if (isHeadline(string)) {
    return contentTypes.HEADLINE
  }
  else if (isSuper(string)) {
    return contentTypes.SUPER
  }
  else if (hasRelation(string)) {
    return contentTypes.DETAIL
  }
  else {
    return undefined
  }
}

const classifyContent = (content) => {
  if (!hasMeta(content)) {
    console.log('hasMeta: false')
    // ToDo: no header, use defaults
  }
  console.log('hasMeta: true')
  const mode = 'UNIQUE'
  // ToDo: read header, overwrite defaults
  content.forEach((slice, index) => {
    const type = getContentType(slice)
    // console.log(type)
    if (!type) {
      return
    }
    const obj = createObjectFromString(type, slice, index, mode)
    switch (type) {
      case contentTypes.HEADLINE: structureCollection.push(obj)
      case contentTypes.SUPER: {
        // ERR: does not add infos to object
        const superObj = addContextToObject(obj)
        structureCollection.push(superObj)
      }
      case contentTypes.DETAIL: {
        // addComponentsToObject function missing
        relationsCollection.push(obj)
      }
    }
    /*
    if (hasRelation(slice) && !isSuper(slice)) {
      const label = slice
      const comps = splitComponents(slice)
      const sliceObj = componentToObject(comps)
      sliceObj.label = label
      // ToDo: add mode to getContentID
      sliceObj.id = getContentID(label)
      sliceObj.content.sender.id = getContentID(
        sliceObj.content.sender.label
      )
      sliceObj.content.object.id = getContentID(
        sliceObj.content.object.label
      )
      sliceObj.content.receiver.id = getContentID(
        sliceObj.content.receiver.label
      )
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
    }*/
  })
  console.log(structureCollection[0])
}

const createBlockIndex = () => {
  // HEADLINES WITHIN DOCUMENT
  const headlines = getTypeMatch(structureCollection, contentTypes.HEADLINE)
  // console.log(headlines)
  if (!headlines) {
    return
  }
  for (let i = 0; i < headlines.length; i++) {
    const headlineStartRange = getStartRange(headlines, i)
    const headlineEndRange = getEndRange(headlines, i)

    // SUPERS WITHIN EACH HEADLINE
    const supers = getCandidates(
      structureCollection,
      contentTypes.SUPER,
      headlineStartRange,
      headlineEndRange
    )
    // console.log(supers)

    // DETAILS WITHIN EACH SUPER
    if (!supers) {
      return
    }
    for (let i = 0; i < supers.length; i++) {
      const superStartRange = getStartRange(supers, i)
      const superEndRange = getEndRange(supers, i)
      const details = getCandidates(
        relationsCollection,
        contentTypes.DETAIL,
        superStartRange,
        superEndRange
      )
      if (!details) {
        return
      }
      // console.log('details:', details)
    }
    // ToDo: Save IDs of BlockCandidates (with ID of SUPER)
  }
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
