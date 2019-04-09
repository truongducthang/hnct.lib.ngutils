const glob = require('glob');
const abs = require('./helpers')
const PurifyCSSPlugin = require('purifycss-webpack');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
	
	module: {
		rules: [
			{
				test: /\.html$/,
        		loader: 'html-loader'
			},
		]
	},

	plugins: [
	],

	optimization: {
        splitChunks: {
			chunks: 'all',
			cacheGroups: {
				angular: {
					test:/[\\/]node_modules[\\/]@angular[\\/]/,
					chunks:'all'
				}
			}
        }
    }
}