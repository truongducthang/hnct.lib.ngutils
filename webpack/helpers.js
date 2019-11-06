const path = require('path')

module.exports = function root(relative) {

    console.log("PATHHHHHH", relative, path.resolve(__dirname, "..", relative))

    return path.resolve(__dirname, "..", relative)
}