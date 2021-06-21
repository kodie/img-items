const Color = require('color')
const ColorDiff = require('color-difference')
const ColorThief = require('color-thief-jimp')
const Jimp = require('jimp')

const isBackground = (color, bgColors, threshold) => {
  let c = Jimp.intToRGBA(color)
  color = Color({ r: c.r, g: c.g, b: c.b }).hex().toUpperCase()

  for (let i = 0; i < bgColors.length; i++) {
    let bgColor = bgColors[i].toUpperCase()
    if (color === bgColor) return true
    if (!threshold) continue
    let compare = ColorDiff.compare(color, bgColor)
    if (compare <= threshold) return true
  }

  return false
}

module.exports = (image, options, callback) => {
  return Jimp.read(image)
    .then(img => {
      let opts = Object.assign({}, {
        background: 0,
        backgroundThreshold: 5,
        gapThreshold: 5,
        gapYThreshold: null,
        gapXThreshold: null,
        sizeThreshold: 5,
        heightThreshold: null,
        widthThreshold: null
      }, options || {})

      let items = []

      if (opts.gapYThreshold === null) opts.gapYThreshold = opts.gapThreshold
      if (opts.gapXThreshold === null) opts.gapXThreshold = opts.gapThreshold
      if (opts.heightThreshold === null) opts.heightThreshold = opts.sizeThreshold
      if (opts.widthThreshold === null) opts.widthThreshold = opts.sizeThreshold

      if (opts.background === 0) {
        opts.background = [img.getPixelColor(0, 0)]
      } else if (typeof opts.background === 'number' && opts.background >= 1 && opts.background <= 10) {
        const palette = ColorThief.getPalette(img, opts.background)
        opts.background = palette.map(c => Color({ r: c[0], g: c[1], b: c[2] }).hex())
      }

      if (!Array.isArray(opts.background)) {
        opts.background = [opts.background]
      }

      for (let i = 0; i < opts.background.length; i++) {
        let bgColor = opts.background[i]

        if (typeof bgColor !== 'string' || bgColor.charAt(0) !== '#') {
          let b = Jimp.intToRGBA(bgColor)
          opts.background[i] = Color({ r: b.r, g: b.g, b: b.b }).hex()
        }
      }

      img.scan(0, 0, img.bitmap.width, img.bitmap.height, (x, y, idx) => {
        const color = img.getPixelColor(x, y)
        let leftGap = 0
        let topGap = 0
        let foundItems = []

        if (isBackground(color, opts.background, opts.backgroundThreshold)) return

        for (let i = (x - 1); i > (x - opts.gapXThreshold - 1); i--) {
          let leftColor = null

          if (i >= 0) {
            leftColor = img.getPixelColor(i, y)
          }

          if (i < 0 || isBackground(leftColor, opts.background, opts.backgroundThreshold)) {
            leftGap++
          } else {
            break
          }
        }

        for (let i = (y - 1); i > (y - opts.gapYThreshold - 1); i--) {
          let topColor = null

          if (i >= 0) {
            topColor = img.getPixelColor(x, i)
          }

          if (i < 0 || isBackground(topColor, opts.background, opts.backgroundThreshold)) {
            topGap++
          } else {
            break
          }
        }

        if (leftGap < opts.gapXThreshold || topGap < opts.gapYThreshold) {
          let l = (x - leftGap - 1)
          let t = (y - topGap - 1)

          foundItems = Array.from(items.keys()).filter(k => {
            let i = items[k]

            return (
              (leftGap < opts.gapXThreshold && (l >= i.left && l <= i.right && y >= i.top && y <= i.bottom)) ||
              (topGap < opts.gapYThreshold && (x >= i.left && x <= i.right && t >= i.top && t <= i.bottom))
            )
          })
        }

        if (foundItems.length) {
          let item = items[foundItems[0]]

          if (foundItems.length > 1) {
            for (let i = 1; i < foundItems.length; i++) {
              let oldItem = items[foundItems[i]]

              if (oldItem.left < item.left) item.left = oldItem.left
              if (oldItem.top < item.top) item.top = oldItem.top
              if (oldItem.right > item.right) item.right = oldItem.right
              if (oldItem.bottom > item.bottom) item.bottom = oldItem.bottom

              items[foundItems[i]] = null
            }

            items = items.filter(i => i !== null)
          }

          if (x < item.left) item.left = x
          if (y < item.top) item.top = y
          if (x > item.right) item.right = x
          if (y > item.bottom) item.bottom = y
        } else {
          let item = {
            left: x,
            top: y,
            right: x,
            bottom: y
          }

          items.push(item)
        }
      })

      items = items.map(i => {
        i.width = (i.right - i.left + 1)
        i.height = (i.bottom - i.top + 1)
        return i
      }).filter(i => {
        return (i.width >= opts.widthThreshold && i.height >= opts.heightThreshold)
      })

      if (callback) callback(null, items)
      return items
    })
    .catch(err => {
      if (callback) callback(err)
      return err
    })
}
