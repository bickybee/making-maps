const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './main.js',
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'main.js'
    },
    devtool: 'source-map',
    devServer: {
        port: 3000,
        clientLogLevel: 'none',
        stats: 'errors-only',
        disableHostCheck: true
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            {
                test: /\.tsx?$/, loader: 'awesome-typescript-loader'
            }
        ]
    },
    plugins: [
        new CopyPlugin([{from: 'data', to: 'data'}]),
        new HtmlPlugin({
            template: 'index.html'
        })
    ]
};
