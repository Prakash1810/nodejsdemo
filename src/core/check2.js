require('dotenv').config();
const { RequestBuilder, Payload } = require('yoti');
const fs = require('fs');
const CLIENT_SDK_ID = process.env.CLIENT_SDK_ID;
const YOTI_BASE_URL = process.env.YOTI_BASE_URL;
const SESSION_ID = "25d5110a-3b15-4420-b63c-b8d4ff0a0948";

// Date.prototype.toUnixTime = function() { return this.getTime()/1000|0 };
// Date.time = function() { return new Date().toUnixTime(); }

const request = new RequestBuilder()
    .withBaseUrl(YOTI_BASE_URL)
    .withPemFilePath(__dirname + '/yoti-key/keys/Beldex-KYC-access-security.pem')
    .withEndpoint(`/sessions/${SESSION_ID}`)
    .withMethod('GET')
    .withQueryParam('sdkId', CLIENT_SDK_ID)
    .build();

async function init() {
    const response = await request.execute();
    console.log("Response", response);
}

init();