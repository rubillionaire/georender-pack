var decode = require('../decode')
var encode = require('../encode')
var test = require('tape')

// ensures that we can encode and decode values

var itemTwoClosedPoly = {
  id: 0,
  type: 'relation',
  tags: {
    type: 'multipolygon',
    bufferDistance: 25.5,
    bufferIndex: 1,
    bufferName: 'first',
  },
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

test('polygon-tags', function (t) {
  var decodedTwoPoly = decode([encode(itemTwoClosedPoly, deps, { includeAllTags: true })])

  t.assert(itemTwoClosedPoly.tags.type === decodedTwoPoly.area.type[0], 'matching type')
  t.assert(itemTwoClosedPoly.tags.bufferDistance === decodedTwoPoly.area.bufferDistance[0], 'matching float, bufferDistance')
  t.assert(itemTwoClosedPoly.tags.bufferIndex === decodedTwoPoly.area.bufferIndex[0], 'matching int, bufferIndex')
  t.assert(itemTwoClosedPoly.tags.bufferName === decodedTwoPoly.area.bufferName[0], 'matching string, bufferName')

  var bufferIndexOnly = decode([encode(itemTwoClosedPoly, deps, { includeTags: ['bufferIndex'] })])

  t.assert(itemTwoClosedPoly.tags.bufferIndex === bufferIndexOnly.area.bufferIndex[0], 'matching int, bufferIndex')
  t.assert(bufferIndexOnly.area.bufferName === undefined, 'accurately missing bufferName')

  t.end()
})
