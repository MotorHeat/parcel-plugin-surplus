const Asset = require('parcel-bundler/src/assets/JSAsset')
const SourceMap = require('parcel-bundler/src/SourceMap')
const compiler = require('surplus/compiler')
const sourceMap = require('source-map')

class JSAsset extends Asset {
  async pretransform () {
    if (this.options.sourceMaps) {
      const { src, map } = compiler.compile(this.contents, {
        sourcemap: 'extract',
        sourcefile: this.relativeName
      })

      if (this.contents === src) {
        if (!this.sourceMap) {
          this.sourceMap = map
        }
        return super.pretransform()
      }

      this.contents = src

      if (this.sourceMap) {
          let smPrev = await new sourceMap.SourceMapConsumer(this.sourceMap)
          let smNew  = await new sourceMap.SourceMapConsumer(map)
          let smMerged = sourceMap.SourceMapGenerator.fromSourceMap(smNew)

          let prevMappings = []
          smPrev.eachMapping( m => prevMappings.push(m) )

          let prevOriginalPositionFor = smPrev.originalPositionFor.bind(smPrev)
          smPrev.originalPositionFor = function (generatedPosition) {
            let pos = {...generatedPosition, bias: sourceMap.SourceMapConsumer.GREATEST_LOWER_BOUND}
            let result = prevOriginalPositionFor(pos)
            if (result.source == null) {
              pos.bias = sourceMap.SourceMapConsumer.LEAST_UPPER_BOUND
              result = prevOriginalPositionFor(pos)
            }
            return result;
          }

          smMerged.applySourceMap(smPrev, this.relativeName)
          this.sourceMap = smMerged.toJSON()

      } else {
        this.sourceMap = map
      }
    } else {
      this.contents = compiler.compile(this.contents)
    }

    return super.pretransform()
  }
}

module.exports = JSAsset
