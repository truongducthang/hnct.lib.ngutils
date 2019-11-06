const webpackMerge = require('webpack-merge');
const devConfig = require('./webpack.common.js');
const abs = require("./helpers")

module.exports = webpackMerge(devConfig, {
    devServer: {
		contentBase: abs('./dist/dev'),
		compress: true,
		port: 9000
	}
});