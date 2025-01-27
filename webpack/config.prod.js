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
        path: path.resolve(process.cwd(), "dist"),
        filename: "bundle.min.js",
    },
    devtool: false,
    performance: {
        maxEntrypointSize: 2500000,
        maxAssetSize: 1200000,
    },
    externals: {
        phaser: "Phaser", // Ensures Phaser is bundled correctly
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
            template: "./index.html",
            inject: true,
        }),
        new CopyPlugin({
            patterns: [
                { from: path.resolve(__dirname, "../public/assets"), to: "assets" },
                { from: path.resolve(__dirname, "../public/style.css"), to: "style.css" },
                { from: path.resolve(__dirname, "../public/favicon.png"), to: "favicon.png" },
            ],
        }),
    ],
};
