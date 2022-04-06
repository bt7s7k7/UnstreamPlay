import { join } from "path"
import { Type } from "../struct/Type"
import dotenv = require("dotenv")

const BASE_DIR = __filename.endsWith("/index.js") || __filename.endsWith("\\index.js") ? __dirname : join(__dirname, "../..")

const Env_t = Type.object({
    PORT: Type.string,
    DATA_PATH: Type.string,
    API_KEY: Type.string,
    YOUTUBE_DL_PATH: Type.string.as(Type.nullable)
})

dotenv.config({ path: join(BASE_DIR, ".env.local") })
dotenv.config({ path: join(BASE_DIR, ".env") })

const variables = Env_t.deserialize(process.env)
export const ENV = { ...variables, BASE_DIR }