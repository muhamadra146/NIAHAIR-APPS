const env =
    require("../../config/env");

const {
    generateSignature
} = require("./accurate.signature");


async function accurateRequest(
    endpoint,
    options = {}
) {


    const timestamp =
        new Date()
            .toISOString();


    const signature =
        generateSignature(
            timestamp,
            env.accurate.secretKey
        );


    const response =
        await fetch(

            `${env.accurate.baseUrl}${endpoint}`,

            {

                method:
                    options.method || "GET",


                headers: {

                    Authorization:
                        `Bearer ${env.accurate.token}`,

                    "Content-Type":
                        "application/json",

                    "X-Api-AppKey":
                        env.accurate.appKey,

                    "X-Api-Timestamp":
                        timestamp,

                    "X-Api-Signature":
                        signature

                },


                body:
                    options.body
                        ? JSON.stringify(options.body)
                        : undefined

            }

        );


    const data =
        await response.json();


    return data;

}


module.exports = {
    accurateRequest
};