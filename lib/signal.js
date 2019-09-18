const signalhub = require("signalhub");
const signalhubws = require("signalhubws");
const WebSocket = require('ws');

module.exports = (impl, url) => {
    if (impl == "signalhub") {
        return signalhub("icetty", [url]);
    } else if (impl == "signalhubws") {
        return signalhubws("icetty", [url], WebSocket)
    }
}