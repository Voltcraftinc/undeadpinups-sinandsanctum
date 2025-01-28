const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const path = require("path");
const webpack = require("webpack");

module.exports = {
    mode: "production",
    entry: "./src/main.js",
    output: {
        path: path.resolve(__dirname, "../dist"),
        filename: "bundle.min.js",
    },
    resolve: {
        alias: {
            phaser: path.resolve(__dirname, "../node_modules/phaser"),
        },
    },
    devtool: false,
    performance: {
        maxEntrypointSize: 2500000,
        maxAssetSize: 1200000,
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
                test: /\.(gif|png|jpe?g|svg|xml|glsl|woff|woff2|ttf|eot)$/i,
                type: "asset/resource",
            },
        ],
    },
    optimization: {
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    output: {
                        comments: false,
                    },
                },
            }),
        ],
    },
    plugins: [
        new CleanWebpackPlugin(),
        new webpack.DefinePlugin({
            "typeof CANVAS_RENDERER": JSON.stringify(true),
            "typeof WEBGL_RENDERER": JSON.stringify(true),
            "typeof FEATURE_SOUND": JSON.stringify(true),
        }),
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, "../public/index.html"),
            filename: "index.html",
            inject: "body",
        }),
        new CopyPlugin({
            patterns: [
                { from: path.resolve(__dirname, "../public/assets"), to: "assets" },
                { from: path.resolve(__dirname, "../public/favicon.png"), to: "favicon.png" },
                { from: path.resolve(__dirname, "../public/style.css"), to: "style.css" },
            ],
        }),
    ],
};
