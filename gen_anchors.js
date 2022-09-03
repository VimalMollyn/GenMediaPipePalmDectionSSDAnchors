let anchorOptions = {
  numLayers: 4,
  minScale: 0.1484375,
  maxScale: 0.75,
  inputSizeWidth: 192,
  inputSizeHeight: 192,
  anchorOffsetX: 0.5,
  anchorOffsetY: 0.5,
  strides: [8, 16, 16, 16],
  aspectRatios: [1.0, 0.5], // <--
  fixedAnchorSize: true,
}

function calculateScale(minScale, maxScale, strideIndex, numStrides) {
  if (numStrides === 1) {
    return (minScale + maxScale) * 0.5
  }
  return minScale + (maxScale - minScale) * 1.0 * strideIndex / (numStrides - 1.0)
}

function generateAnchors(options) {
  const anchors = []
  if (!options.featureMapHeightSize && !options.strides?.length) {
    throw new Error('Both feature map shape and strides are missing. Must provide either one.')
  }
  if (options.featureMapHeightSize) {
    if (options.strides?.length) {
      throw new Error('Found feature map shapes. Strides will be ignored.')
    }
    if (options.featureMapHeightSize !== options.numLayers) {
      throw new Error('options.featureMapHeightSize !== options.numLayers')
    }
    if (options.featureMapHeightSize !== options.featureMapWidth_size) {
      throw new Error('options.featureMapHeightSize !== options.featureMapWidth_size')
    }
  } else {
    if (options.strides.length !== options.numLayers) {
      throw new Error('options.options.strides.length !== options.numLayers')
    }
  }

  let layerId = 0
  while (layerId < options.numLayers) {
    let anchorHeight = []
    let anchorWidth = []
    let aspectRatios = []
    let scales = []

    // console.log('layerId=', layerId)

    let lastSameStrideLayer = layerId
    while (lastSameStrideLayer < options.strides.length && options.strides[lastSameStrideLayer] === options.strides[layerId]) {
      const scale = calculateScale(options.minScale, options.maxScale, lastSameStrideLayer, options.strides.length)
      if (lastSameStrideLayer === 0 && options.reduceBoxesInLowestLayer) {
        aspectRatios.push(1.0)
        aspectRatios.push(2.0)
        aspectRatios.push(0.5)
        scales.push(0.1)
        scales.push(scale)
        scales.push(scale)
      } else {
        for (let aspectRatioId = 0; aspectRatioId < options.aspectRatios.length; aspectRatioId++) {
          aspectRatios.push(options.aspectRatios[aspectRatioId])
          scales.push(scale)
        }
        if (options.interpolatedScaleAspectRatio > 0.0) {
          const scaleNext = lastSameStrideLayer === options.strides.length - 1 ? 1.0 : calculateScale(options.minScale, options.maxScale, lastSameStrideLayer + 1, options.strides.length)
          scales.push(Math.sqrt(scale * scaleNext))
          aspectRatios.push(options.interpolatedScaleAspectRatio)
        }
      }
      lastSameStrideLayer++
    }

    for (let i = 0; i < aspectRatios.length; i++) {
      const ratioSqrts = Math.sqrt(aspectRatios[i])
      anchorHeight.push(scales[i] / ratioSqrts)
      anchorWidth.push(scales[i] * ratioSqrts)
    }

    let featureMapHeight = 0
    let featureMapWidth = 0
    if (options.featureMapHeightSize) {
      featureMapHeight = options.featureMapHeight[layerId]
      featureMapWidth = options.featureMapWidth[layerId]
    } else {
      const stride = options.strides[layerId]
      featureMapHeight = Math.ceil(options.inputSizeHeight / stride)
      featureMapWidth = Math.ceil(options.inputSizeWidth / stride)
    }

    for (let y = 0; y < featureMapHeight; y++) {
      for (let x = 0; x < featureMapWidth; x++) {
        for (let anchorId = 0; anchorId < anchorHeight.length; anchorId++) {
          const xCenter = (x + options.anchorOffsetX) / featureMapWidth
          const yCenter = (y + options.anchorOffsetY) / featureMapHeight

          let newAnchor = {}
          newAnchor.xCenter = xCenter
          newAnchor.yCenter = yCenter

          if (options.fixedAnchorSize) {
            newAnchor.w = 1
            newAnchor.h = 1
          } else {
            newAnchor.w = anchorWidth[anchorId]
            newAnchor.h = anchorHeight[anchorId]
          }
          anchors.push(newAnchor)
        }
      }
    }
    layerId = lastSameStrideLayer
  }

  return anchors
}

anchors = generateAnchors(anchorOptions)

// {
//   xCenter: 0.9583333333333334,
//   yCenter: 0.9583333333333334,
//   w: 1,
//   h: 1
// }

for (let i=0; i<anchors.length; i++){
    a = anchors[i];
    console.log(a.xCenter+","+a.yCenter+","+a.w+","+a.h);
}
