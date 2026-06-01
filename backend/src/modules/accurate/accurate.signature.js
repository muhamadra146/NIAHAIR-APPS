const crypto = require("crypto");


function generateSignature(
    timestamp,
    secretKey
) {

    return crypto
        .createHmac(
            "sha256",
            secretKey
        )
        .update(timestamp)
        .digest("base64");

}


module.exports = {
    generateSignature
};