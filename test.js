const imgItems = require('.')
const Jimp = require('jimp')
const fs = require('fs-extra')
const test = require('ava')

const testDir = 'test_output'
const testImg = 'assets/feed-example.png'

fs.ensureDir(testDir)
  .then(e => fs.emptyDir(testDir))
  .then(e => Jimp.read(testImg))
  // .then(image => image.resize(image.bitmap.width / 4, Jimp.AUTO)) // Optionally shrink the image to speed things up
  .then(async image => {
    const items = await imgItems(image, {
      // background: 0,
      // backgroundThreshold: 5,
      // gapThreshold: 5,
      // gapHeightThreshold: null,
      // gapWidthThreshold: null,
      // sizeThreshold: 5,
      // heightThreshold: null,
      // widthThreshold: null
    })

    console.log(items)

    // Extract all items as images
    items.forEach((item, i) => {
      const img = image.clone().crop(item.left, item.top, item.width, item.height)
      img.writeAsync(testDir + '/' + i + '.' + img.getExtension())
    })

    // Extract the largest item as an image
    const largest = items.reduce((p, c) => ((p.width + p.height) > (c.width + c.height)) ? p : c)
    const largestImg = image.clone().crop(largest.left, largest.top, largest.width, largest.height)
    largestImg.writeAsync(testDir + '/largest.' + largestImg.getExtension())

    // Spit out the 2-bit pHash of the largest item
    console.log('Largest Item Hash:', largestImg.hash(2))

    // Fill in all items
    const filledImg = image.clone()
    items.forEach((item, i) => {
      filledImg.scan(item.left, item.top, item.width, item.height, function (x, y, idx) {
        this.bitmap.data.writeUInt32BE(Jimp.cssColorToHex('#ff0000'), idx, true)
      })
    })
    filledImg.writeAsync(testDir + '/filled.' + filledImg.getExtension())

    // @TODO: Implement better testing
    test('items count', t => {
      t.is(items.length, 50)
    })
  })
