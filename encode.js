var earcut = require('earcut')
var featuresJSON = require('./features.json')
var osmIsArea = require('osm-is-area')
var varint = require('varint')
var sortMembers = require('./lib/sort.js')
var tagPriorities = require('./lib/tagpriorities.json')
var tagValueTypes = require('./lib/tag-value-types.js')

var features = {}
for (var i=0; i<featuresJSON.length; i++) {
  features[featuresJSON[i]] = i
}

module.exports = function (item, deps, opts) {
  var type = features['place.other']
  var tags = Object.entries(item.tags)
  // TODO this does not quite work yet, lets figure it out before considering it
  // var featureTypes = opts && opts.featureTypes
  var includeTags = opts && (opts.includeAllTags === true || opts.includeTags === '*')
    ? '*'
    : opts && opts.includeTags && Array.isArray(opts.includeTags)
      ? opts.includeTags
      : []

  // if (Array.isArray(featureTypes)) {
  //   features = {}
  //   for (var i=0; i<featureTypes.length; i++) {
  //     features[featureTypes[i]] = i
  //   }
  // }
  if(tags.length !== 0){
    var arr = []
    var priorities = []
    for (var i=0; i<tags.length; i++) {
      if (features[tags[i][0] + '.' + tags[i][1]] !== undefined) {
        type = features[tags[i][0] + '.' + tags[i][1]]
        arr.push(tags[i][0] + '.' + tags[i][1])
      }
    }
    if (arr.length > 1) {
      arr.sort()
      for (var j=0; j<arr.length; j++) {
        if (tagPriorities[arr[j]] && tagPriorities[arr[j]].priority) {
          priorities.push(tagPriorities[arr[j]].priority)
        }
        else if (tagPriorities[arr[j].split('.')[0]+'.*'] &&
          tagPriorities[arr[j].split('.')[0]+'.*'].priority) {
            priorities.push(tagPriorities[arr[j].split('.')[0]+'.*'].priority)
        }
        else priorities.push(50)
      }
      type = features[arr[priorities.indexOf(Math.max(...priorities))]]
    }
  }
  var id = item.id

  var includedTags = includeTags === '*'
    ? item.tags
    : tags.filter(t => includeTags.includes(t[0]))
      .reduce((acc, curr) => {
        acc[curr[0]] = curr[1]
        return acc
      }, {})

  if (item.type === 'node') {
    var typeLen = varint.encodingLength(type)
    var idLen = varint.encodingLength(id)
    var labelLen = getLabelLen(item.tags)
    var tagLen = getTagLen(includedTags)
    var buf = Buffer.alloc(9 + typeLen + idLen + labelLen + tagLen)
    var offset = 0
    buf.writeUInt8(0x01, offset) 
    offset+=1
    varint.encode(type, buf, offset)
    offset+=varint.encode.bytes
    varint.encode(id, buf, offset)
    offset+=varint.encode.bytes
    buf.writeFloatLE(item.lon, offset)
    offset+=4
    buf.writeFloatLE(item.lat, offset)
    offset+=4
    offset = writeLabelData(item.tags, buf, offset)
    offset = writeTagData(includedTags, buf, offset)
  }
  if (item.type === 'way') {
    for (var i=0; i<item.refs.length; i++) {
      if (!deps[item.refs[i]]) {
        var buf = Buffer.alloc(0)
        return
      }
    }
    if (osmIsArea(item)) {
      var typeLen = varint.encodingLength(type)
      var idLen = varint.encodingLength(id)
      var coords = []
      for (var i=0; i<item.refs.length; i++) {
        if (!deps[item.refs[i]]) continue
        coords.push(deps[item.refs[i]].lon)
        coords.push(deps[item.refs[i]].lat) 
      }
      var pCount = coords.length/2
      var pCountLen = varint.encodingLength(pCount)
      var cells = earcut(coords)
      var cLen = varint.encodingLength(cells.length/3)
      var cSize = 0
      for (var i=0; i<cells.length; i++) {
        cSize+=varint.encodingLength(cells[i])
      }
      var labelLen = getLabelLen(item.tags)
      var tagLen = getTagLen(includedTags)
      var buf = Buffer.alloc(1 + typeLen + idLen + pCountLen + pCount*4*2 + cLen + cSize + labelLen + tagLen)
      var offset = 0
      buf.writeUInt8(0x03, 0)
      offset+=1
      varint.encode(type, buf, offset)
      offset+=varint.encode.bytes
      varint.encode(id, buf, offset)
      offset+=varint.encode.bytes
      varint.encode(pCount, buf, offset)
      offset+=varint.encode.bytes
      for (var i=0; i<coords.length; i++) {
        buf.writeFloatLE(coords[i], offset)
        offset+=4
      }
      varint.encode(cells.length/3, buf, offset)
      offset+=varint.encode.bytes
      for (var i=0; i<cells.length; i++){
        varint.encode(cells[i], buf, offset)
        offset+=varint.encode.bytes
      }
      offset = writeLabelData(item.tags, buf, offset)
      offset = writeTagData(includedTags, buf, offset)
    }
    else if (item.refs.length > 1) {
      var typeLen = varint.encodingLength(type)
      var idLen = varint.encodingLength(id)
      var coords = []
      for (var i=0; i<item.refs.length; i++) {
        if (!deps[item.refs[i]]) continue
        coords.push(deps[item.refs[i]].lon)
        coords.push(deps[item.refs[i]].lat) 
      }
      var pCount = coords.length/2
      var pCountLen = varint.encodingLength(pCount)
      var labelLen = getLabelLen(item.tags)
      var tagLen = getTagLen(includedTags)
      var buf = Buffer.alloc(1 + typeLen + idLen + pCount*4*2 + pCountLen + labelLen + tagLen)
      var offset = 0
      buf.writeUInt8(0x02, 0)
      offset+=1
      varint.encode(type, buf, offset)
      offset+=varint.encode.bytes
      varint.encode(id, buf, offset)
      offset+=varint.encode.bytes
      varint.encode(pCount, buf, offset)
      offset+=varint.encode.bytes
      for (var i=0; i<coords.length; i++) {
        buf.writeFloatLE(coords[i], offset)
        offset+=4
      }
      offset = writeLabelData(item.tags, buf, offset)
      offset = writeTagData(includedTags, buf, offset)
    }
    else {
      var buf = Buffer.alloc(0)
    }
  }
  if (item.type === 'relation') {
    if (osmIsArea(item)) {
      var typeLen = varint.encodingLength(type)
      var idLen = varint.encodingLength(id)
      var coords = []
      var cells = []
      var holes = []
      var ppositions = []
      var closed = false
      var ref0 = -1
      var members = item.members.slice()
      if (item.members[0].role === "inner") {
        var outerStart
        var outerEnd = members.length
        for (var i=0; i<item.members.length; i++) {
          if (item.members[i].role === 'outer') {
            outerStart = i
            break
          }
        }
        for (; i<item.members.length; i++) {
          if (item.members[i].role !== 'outer') {
            outerEnd = i
            break
          }
        }
        var outers = members.splice(outerStart, outerEnd-outerStart)
        var sargs = [0,0]
        sargs.push.apply(sargs, outers)
        members.splice.apply(members, sargs)
      }
      var smembers = sortMembers(members, deps, item.id)
      /* generate deps for test cases
      var test = {}
      if (item.id === 9168008) {
        for (var i=0; i<item.members.length; i++) {
          //if (!deps[item.members[i].id]) console.error(item.members[i].id)
          test[item.members[i].id] = deps[item.members[i].id]
        }
        console.error(JSON.stringify(test, null, 2))
      }
      */
      for (var i=0; i<smembers.length; i++) {
        var role = smembers[i].role
        if (role === "outer") {
          if (closed) {
            var pcells = earcut(ppositions, holes)
            for (var j=0; j<pcells.length; j++) {
              cells.push(pcells[j] + coords.length/2 - ppositions.length/2)
            }
            ppositions = []
            holes = []
            ref0 = -1
            closed = false
          }
          if (!deps[smembers[i].id]) continue
          var member = deps[smembers[i].id]
          if (!member.refs) continue
          if (smembers[i].reverse) member.refs.reverse()
          for (var j=0; j<member.refs.length; j++) {
            if (ref0 === member.refs[j]) {
              closed = true
              ref0 = -1
              continue
            }
            if (ref0 < 0) { ref0 = member.refs[j] }
            var ref = deps[member.refs[j]]
            if (!ref) continue
            ppositions.push(ref.lon, ref.lat)
            coords.push(ref.lon, ref.lat)
          }
        }
        else if (smembers[i].role === "inner") {
          if (!deps[smembers[i].id]) continue
          var member = deps[smembers[i].id]
          if (!member.refs) continue
          if (smembers[i].reverse) member.refs.reverse()
          for (var j=0; j<member.refs.length; j++) {
            if (ref0 === member.refs[j]) {
              ref0 = -1
              continue
            }
            if (ref0 < 0) {
              ref0 = member.refs[j]
              holes.push(ppositions.length/2)
            }
            var ref = deps[member.refs[j]]
            if (!ref) continue
            ppositions.push(ref.lon, ref.lat)
            coords.push(ref.lon, ref.lat)
          }
        }
      }
      if (closed) {
        var pcells = earcut(ppositions, holes)
        for (var j=0; j<pcells.length; j++) {
          cells.push(pcells[j] + coords.length/2 - ppositions.length/2)
        }
        ppositions = []
        holes = []
      }
      var pCount = coords.length/2
      var pCountLen = varint.encodingLength(pCount)
      var cLen = varint.encodingLength(cells.length/3)
      var cSize = 0
      for (var i=0; i<cells.length; i++) {
        cSize+=varint.encodingLength(cells[i])
      }
      var labelLen = getLabelLen(item.tags)
      var tagLen = getTagLen(includedTags)
      var buf = Buffer.alloc(1 + typeLen + idLen + pCountLen + pCount*4*2 + cLen + cSize + labelLen + tagLen)
      var offset = 0
      buf.writeUInt8(0x03, 0)
      offset+=1
      varint.encode(type, buf, offset)
      offset+=varint.encode.bytes
      varint.encode(id, buf, offset)
      offset+=varint.encode.bytes
      varint.encode(pCount, buf, offset)
      offset+=varint.encode.bytes
      for (var i=0; i<coords.length; i++) {
        buf.writeFloatLE(coords[i], offset)
        offset+=4
      }
      varint.encode(cells.length/3, buf, offset)
      offset+=varint.encode.bytes
      cells.forEach(function (item) {
        varint.encode(item, buf, offset)
        offset+=varint.encode.bytes
      })
      offset = writeLabelData(item.tags, buf, offset)
      offset = writeTagData(includedTags, buf, offset)
    }
    else {
      var buf = Buffer.alloc(0)
    }
  }
  return buf
}

var nameRegEx = /^([^:]+_|)name($|:)/
var nameReplaceRegEx = /^(|[^:]+_)name($|:)/

function getLabelLen (tags) {
  var labelLen = 1
  Object.keys(tags).forEach(function (key) {
    if (!nameRegEx.test(key)) { return }
    var pre = key.startsWith('alt_name:')
      ? key.replace(nameReplaceRegEx,'alt:')
      : key.replace(nameReplaceRegEx,'')
    var dataLen = Buffer.byteLength(pre) + 1
      + Buffer.byteLength(tags[key]) 
    labelLen += varint.encodingLength(dataLen) + dataLen
  })
  return labelLen
}

function writeLabelData (tags, buf, offset) {
  Object.keys(tags).forEach(function (key) {
    if (!nameRegEx.test(key)) { return }
    var pre = key.startsWith('alt_name:')
      ? key.replace(nameReplaceRegEx,'alt:')
      : key.replace(nameReplaceRegEx,'')
    var dataLen = Buffer.byteLength(pre) + 1
      + Buffer.byteLength(tags[key])
    varint.encode(dataLen, buf, offset)
    offset+=varint.encode.bytes
    var data = pre + '=' + tags[key]
    buf.write(data, offset)
    offset+=Buffer.byteLength(data)
  })
  varint.encode(0, buf, offset)
  offset+=varint.encode.bytes
  return offset
}

function getTagLen (tags) {
  var tagLen = 0 
  Object.keys(tags).forEach(function (key) {
    if (nameRegEx.test(key)) { return }
    var tagKey = key
    var tagValue = tags[key]
    if (typeof tagValue === 'object' || Array.isArray(tagValue)) { return }
    var tagValueType
    var tagValueLen
    if (Number.isInteger(tagValue)) {
      tagValueType = tagValueTypes.INT
      tagValueLen = varint.encodingLength(tagValue)
    }
    else if (isNaN(tagValue)) {
      tagValueType = tagValueTypes.STRING
      tagValueLen = varint.encodingLength(Buffer.byteLength(tagValue)) + Buffer.byteLength(tagValue)
    }
    else {
      tagValueType = tagValueTypes.FLOAT
      tagValueLen = 4
    }
    var dataLen = varint.encodingLength(Buffer.byteLength(tagKey)) + Buffer.byteLength(tagKey) +
      varint.encodingLength(tagValueType) +
      tagValueLen
    tagLen += dataLen
  })
  // we end with a 0 to signal we are done reading tag data
  tagLen += varint.encodingLength(0)
  return tagLen
}

function writeTagData (tags, buf, offset) {
  Object.keys(tags).forEach(function (key) {
    if (nameRegEx.test(key)) { return }
    var tagKey = key
    var tagValue = tags[key]
    if (typeof tagValue === 'object' || Array.isArray(tagValue)) { return }
    var tagValueType
    var tagValueLen
    if (Number.isInteger(tagValue)) {
      tagValueType = tagValueTypes.INT
      tagValueLen = varint.encodingLength(tagValue)
    }
    else if (isNaN(tagValue)) {
      tagValueType = tagValueTypes.STRING
      tagValueLen = Buffer.byteLength(tagValue)
    }
    else {
      tagValueType = tagValueTypes.FLOAT
      tagValueLen = 4
    }
      
    varint.encode(Buffer.byteLength(tagKey), buf, offset)
    offset += varint.encode.bytes
    buf.write(tagKey, offset)
    offset += Buffer.byteLength(tagKey)

    buf.writeUInt8(tagValueType, offset)
    offset += 1
    if (tagValueType === tagValueTypes.INT) {
      varint.encode(tagValue, buf, offset)
      offset += varint.encode.bytes
    }
    else if (tagValueType === tagValueTypes.FLOAT) {
      buf.writeFloatLE(tagValue, offset)
      offset += 4
    }
    else if (tagValueType === tagValueTypes.STRING) {
      varint.encode(tagValueLen, buf, offset)
      offset += varint.encode.bytes
      buf.write(tagValue, offset)
      offset += tagValueLen
    }
  })
  varint.encode(0, buf, offset)
  offset+=varint.encode.bytes
  return offset
}
