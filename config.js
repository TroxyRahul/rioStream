const SERVER = {
    HOST: process.env.HOST || "0.0.0.0",
    PORT: process.env.PORT || 3001
}

const DRAMA = {
    DOMAIN: process.env.DOMAIN || "https://watchasia.to",
}

const ENCRYPTION = {
    KEY: "93422192433952489752342908585752",
    IV: "9262859232435825"
}

export default { SERVER, DRAMA, ENCRYPTION };