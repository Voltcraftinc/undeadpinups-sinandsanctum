const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");
const webpack = require("webpack");

module.exports = {
    mode: "development",
    devtool: "eval-source-map",
    entry: "./src/main.js",
    output: {
        path: path.resolve(process.cwd(), "dist"),
        filename: "bundle.min.js",
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                },
            },
            {
                test: [/\.vert$/, /\.frag$/],
                use: "raw-loader",
            },
            {
                test: /\.(gif|png|jpe?g|svg|xml|glsl)$/i,
                use: "file-loader",
            },
        ],
    },
    plugins: [
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: [path.join(__dirname, "../dist/**/*")],
        }),
        new webpack.DefinePlugin({
            "typeof CANVAS_RENDERER": JSON.stringify(true),
            "typeof WEBGL_RENDERER": JSON.stringify(true),
            "typeof FEATURE_SOUND": JSON.stringify(true),
        }),
        new HtmlWebpackPlugin({
            template: "./public/index.html", // Now correctly points to the moved file
        }),
        new CopyPlugin({
            patterns: [
                { from: path.resolve(process.cwd(), 'public/assets'), to: 'assets' },
                { from: path.resolve(process.cwd(), 'public/style.css'), to: 'style.css' },
                { from: path.resolve(process.cwd(), 'public/favicon.png'), to: 'favicon.png' },
        
            ],
        }),
    ],
    devServer: {
        static: {
            directory: path.resolve(process.cwd(), "public"),
        },
        compress: true,
        port: 9000,
        hot: true,
        open: true,
    },
};
