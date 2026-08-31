module.exports = {
    // Webpack override
    webpack: function override(config, env) {
        if (env === "development") {
            config.devtool = false; // Disable source maps in development
        }
        return config;
    },

    // Dev server override for react-app-rewired
    devServer: function (configFunction) {
        return function (proxy, allowedHost) {
            const config = configFunction(proxy, allowedHost);
            // Ensure the dev server allowedHosts is set to a valid non-empty string
            config.allowedHosts = ["localhost"];
            return config;
        };
    },
};
