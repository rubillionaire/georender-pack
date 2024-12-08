var fs = require('fs')
var through = require('through2')
var parseOSM = require('osm-pbf-parser')
const lpb = require('length-prefixed-buffers/without-count')
var georenderPack = require('../encode.js')
 
var osm = parseOSM()
var allItems = {}
var itemsRefsObject = {}

const pbfFile = process.argv[2]
const lpbFile = `${pbfFile}.lpb`

fs.createReadStream(pbfFile)
  .pipe(osm)
  .pipe(through.obj(write, end))

function write (items, enc, next) {
  items.forEach(function (item) {
    if (item.type === 'node') {
      allItems[item.id] = item
    }
    else if (item.type === 'way') {
      allItems[item.id] = item
      item.refs.forEach(function (ref) {
        if (!itemsRefsObject[ref]) itemsRefsObject[ref] = allItems[ref]
        else return
      })
    }
    else if (item.type === 'relation') {
      allItems[item.id] = item
    }
  })
  next()
}
function end (next) {
  const buffers = []
  Object.values(allItems).forEach(function (item) {
    buffers.push(georenderPack(item, itemsRefsObject))
  })
  var encoded = Buffer.alloc(lpb.length(buffers))
  lpb.encode(encoded, buffers)
  fs.writeFileSync(lpbFile, encoded)
}
