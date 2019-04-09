const path = require('path')

module.exports = function root(relative) {
    return path.resolve(__dirname, "..", relative)
}