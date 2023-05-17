/* eslint-disable no-undef */
/* eslint-disable no-console */
// @ts-check

const { readdir, writeFile } = require("fs/promises")
const { join, resolve } = require("path")
const { inspect } = require("util")

const args = {
    url: "",
    playlist: "",
    output: ""
}

const processArg = (/** @type {string} */ name, /** @type {string | boolean} */ value) => {
    if (!(name in args)) throw new Error(`Invalid argument ${JSON.stringify(name)}`)
    if (typeof value != typeof args[name]) throw new Error(`Invalid type for argument ${JSON.stringify(name)}, expected ${typeof args[value]}`)
    args[name] = value
}
/** @type {string | null} */
let lastArgument = null
for (const arg of process.argv) {
    if (arg == "--") break

    if (arg.startsWith("--")) {
        if (lastArgument != null) processArg(lastArgument, true)
        lastArgument = arg.slice(2)
    } else if (lastArgument != null) {
        processArg(lastArgument, arg)
        lastArgument = null
    }
}

if (lastArgument != null) {
    processArg(lastArgument, true)
}

if (!args.playlist) throw new Error("Please provide playlist ID with --playlist argument")
if (!args.url) throw new Error("Please provide Unstream url with --url argument")
if (args.url.slice(-1) == "/") args.url = args.url.slice(0, -1)

const output = resolve(args.output || ".")

/** @typedef {{ url: string, filename: string, label: string }} Track */

const colors = inspect.colors
const addColor = (/** @type {string} */ text, /** @type {string} */ color) => {
    const colorCode = colors[color]
    if (colorCode == null) throw new Error("Invalid color name " + color)
    return `\u001b[${colorCode[0]}m${text}\u001b[${colorCode[1]}m`
}

fetch(args.url + "/api/export?playlist=" + encodeURIComponent(args.playlist)).then(v => v.json()).then(async (/** @type {Track[]} */ data) => {
    /** @type {Promise<void>[]} */
    const queue = []
    const existing = new Set(await readdir(output))
    let pending = 0
    let done = 0

    const write = (/** @type {Track} */ track, /** @type {"pending" | "done" | Error} */ state) => {
        console.log(`Exporting... (${done}/${pending}), [${state == "pending" ? (
            addColor("PENDING", "yellow")
        ) : state == "done" ? (
            addColor("DONE", "green")
        ) : (
            addColor("ERROR", "red")
        )
            }]${track.label}`)
    }

    for (const track of data) {
        queue.push((async () => {
            if (existing.has(track.filename)) return

            pending++
            await Promise.resolve()

            write(track, "pending")
            const targetPath = join(output, track.filename)
            const content = await fetch(args.url + track.url).then(v => v.arrayBuffer())

            try {
                await writeFile(targetPath, Buffer.from(content))
                done++
                write(track, "done")
            } catch (err) {
                done++
                write(track, err)
                console.error(err)
            }
        })())
    }

    await Promise.all(queue)

    if (pending == 0) console.log("No new tracks")
    console.log("Exporting finished!")
})
