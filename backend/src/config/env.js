require("dotenv").config();

const requiredEnvs = [

    "DATABASE_URL",

    "ACCURATE_APP_KEY",

    "ACCURATE_SECRET_KEY",

    "ACCURATE_ACCESS_TOKEN",

    "ACCURATE_BASE_URL",

    "JWT_SECRET"
];


for (const envName of requiredEnvs) {

    if (!process.env[envName]) {

        throw new Error(
            `Missing env: ${envName}`
        );
    }
}


module.exports = {

    PORT:
        process.env.PORT || 3000,

    jwt: {

        secret:
            process.env.JWT_SECRET,

        expiresIn:
            process.env.JWT_EXPIRES_IN || "7d"

    },

    accurate: {

        appKey:
            process.env.ACCURATE_APP_KEY,

        secretKey:
            process.env.ACCURATE_SECRET_KEY,

        token:
            process.env.ACCURATE_ACCESS_TOKEN,

        baseUrl:
            process.env.ACCURATE_BASE_URL

    }

};