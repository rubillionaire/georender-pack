var decode = require('../decode')
var encode = require('../encode')
var test = require('tape')

// ensures that we can encode and decode values that
// have their tags as part of the data pipeline

const tags = {
  bufferDistance: 25.5,
  bufferIndex: 1,
  bufferName: 'first',
}

const multipolygonTags = Object.assign({ type: 'multipolygon' }, tags)
const pointTags = Object.assign({}, tags)
const lineTags = Object.assign({}, tags)

var itemTwoClosedPoly = {
  id: 0,
  type: 'relation',
  tags: multipolygonTags,
  members: [{
    type: 'way',
    id: 100,
    role: 'outer'
  }, {
    type: 'way',
    id: 101,
    role: 'outer'
  }, {
    type: 'way',
    id: 102,
    role: 'outer'
  }, {
    type: 'way',
    id: 103,
    role: 'outer'
  }]
}

var itemOneClosedPoly = {
  id: 1,
  type: 'relation',
  tags: {
    type: 'multipolygon',
  },
  members: [{
    type: 'way',
    id: 100,
    role: 'outer'
  }, {
    type: 'way',
    id: 101,
    role: 'outer'
  }]
}

var deps = {
  100: {
    id: 100,
    type: 'way',
    refs: [200, 201, 202],
  },
  101: {
    id: 2,
    type: 'way',
    refs: [202, 203, 200],
  },
  102: {
    id: 3,
    type: 'way',
    refs: [210, 211, 212],
  },
  103: {
    id: 4,
    type: 'way',
    refs: [212, 213, 210],
  },
  200: {
    type: 'node',
    lon: 10,
    lat: 10,
  },
  201: {
    type: 'node',
    lon: 20,
    lat: 20,
  },
  202: {
    type: 'node',
    lon: 10,
    lat: 20,
  },
  203: {
    type: 'node',
    lon: 0,
    lat: 20,
  },
  210: {
    type: 'node',
    lon: -10,
    lat: -10,
  },
  211: {
    type: 'node',
    lon: -20,
    lat: -20,
  },
  212: {
    type: 'node',
    lon: -10,
    lat: -20,
  },
  213: {
    type: 'node',
    lon: 0,
    lat: -20,
  }
}

var point = {
  type: 'node',
  tags: pointTags,
  id: 5,
  lon: 0,
  lat: 10,
}

var point1 = Object.assign({}, point, { id: 6 })
var point2 = Object.assign({}, point, { id: 7 })
point1.tags.name = 'San Juan'
point1.tags.name = 'Caguas'

var line = {
  id: 6,
  type: 'way',
  tags: lineTags,
  refs: [210, 211, 212]
}

test('tags', function (t) {
  var decodedTwoPoly = decode([encode(itemTwoClosedPoly, deps, { includeAllTags: true })])

  t.assert(itemTwoClosedPoly.tags.type === decodedTwoPoly.area.type[0], 'area: matching type')
  t.assert(itemTwoClosedPoly.tags.bufferDistance === decodedTwoPoly.area.bufferDistance[0], 'area: matching float, bufferDistance')
  t.assert(itemTwoClosedPoly.tags.bufferIndex === decodedTwoPoly.area.bufferIndex[0], 'area: matching int, bufferIndex')
  t.assert(itemTwoClosedPoly.tags.bufferName === decodedTwoPoly.area.bufferName[0], 'area: matching string, bufferName')

  var bufferIndexOnly = decode([encode(itemTwoClosedPoly, deps, { includeTags: ['bufferIndex'] })])

  t.assert(itemTwoClosedPoly.tags.bufferIndex === bufferIndexOnly.area.bufferIndex[0], 'area 2: matching int, bufferIndex')
  t.assert(bufferIndexOnly.area.bufferName === undefined, 'area 2: accurately missing bufferName')

  var lineDecoded = decode([encode(line, deps, { includeTags: '*' })])

  t.assert(tags.bufferDistance === lineDecoded.line.bufferDistance[0], 'line: matching float, bufferDistance')
  t.assert(tags.bufferIndex === lineDecoded.line.bufferIndex[0], 'line: matching int, bufferIndex')
  t.assert(tags.bufferName === lineDecoded.line.bufferName[0], 'line: matching string, bufferName')

  var pointDecoded = decode([encode(point, [], { includeTags: Object.keys(tags) })])

  t.assert(tags.bufferDistance === pointDecoded.point.bufferDistance[0], 'point: matching float, bufferDistance')
  t.assert(tags.bufferIndex === pointDecoded.point.bufferIndex[0], 'point: matching int, bufferIndex')
  t.assert(tags.bufferName === pointDecoded.point.bufferName[0], 'point: matching string, bufferName')

  var pointLabelsDecoded = decode([
    encode(point1, []),
    encode(point2, []),
  ])

  t.assert(pointLabelsDecoded.point.labels.hasOwnProperty(point1.id), `point: includes label for ${point1.id}`)
  t.assert(pointLabelsDecoded.point.labels.hasOwnProperty(point2.id), `point: includes label for ${point2.id}`)

  t.end()
})
