const webpackMerge = require('webpack-merge');
const commonConfig = require('./webpack.common.js');
const abs = require('./helpers')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");

module.exports = webpackMerge(commonConfig, {
    mode: 'production',
    output: {
        path: abs("./dist"),
        publicPath: '/',
        filename: 'hnct.ngutils.js',
        library: "@hnct/ngutils",
        libraryTarget: "umd"
    },

    externals: [
        function(context, request, callback) {
            if (/^@angular\/.+$/.test(request)){
                return callback(null, 'commonjs ' + request);
            }
            callback();
        },
        {
            lodash : {
                commonjs: "lodash",
                commonjs2: "lodash",
                amd: "lodash",
                root: "_"
            },
            jsonwebtoken : {
                commonjs: "jsonwebtoken",
                commonjs2: "jsonwebtoken"
            }
        }
    ],

    entry: {
        main: './dist/src/ts/index.js'
    },

    module: {
        rules: [
            {
                test: /(?:\.ts)$/,
                use: {
                    loader: 'awesome-typescript-loader'
                }
            }
        ]
    },

    optimization: {
        minimize: false
    },
    plugins : [
        new BundleAnalyzerPlugin({
            analyzerMode: 'static'
        }),
    ],

    resolve: {
		extensions: [ '.tsx', '.ts', '.js','scss', 'css', 'woff', 'woff2', 'ttf', 'otf', 'eot' ],
		// important, allow angular esm2015 modules to be used, help tree shaking to work.
        mainFields: ['esm2015', 'browser', 'module', 'main']
	}
});