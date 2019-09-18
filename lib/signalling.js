const signalhub = require("signalhub");
const signalhubws = require("signalhubws");
const signalhubfb = require("./signalhubfb")("icetty-4c872", "AIzaSyAcuUCN47mbqfpccsSKeoNrZmrM3AskKDQ");
const WebSocket = require('ws');

module.exports = (impl, url) => {
    if (impl == "signalhub") {
        return signalhub("icetty", [url]);
    } else if (impl == "signalhubws") {
        return signalhubws("icetty", [url], WebSocket)
    } else if (impl == "signalhubfb") {
        return signalhubfb("icetty")
    } else {
        throw new Error("Unsupported signalling method!")
    }
}