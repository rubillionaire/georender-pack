const fs = require('node:fs')
const lpb = require('length-prefixed-buffers/without-count')
var decode = require('../decode.js')

const lpbEncodedFile = process.argv[2]

const buf = fs.readFileSync(lpbEncodedFile)
var buffers = lpb.decode(buf)

console.log(decode(buffers))
