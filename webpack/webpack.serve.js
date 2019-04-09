var webpackMerge = require('webpack-merge');
var webpackConfig = require('./webpack.dev.js');
var serve = require("webpack-serve");

serve({}, {
	config: webpackConfig,
	/*hot : {
		port: 9080
	},*/

	hot: false,

	port: 9090
}).then( result => {
	console.log("Webpack serve runs with result = ", result);
})