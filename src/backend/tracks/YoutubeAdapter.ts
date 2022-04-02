import axios from "axios"
import { extname } from "path"
import { ENV } from "../../app/ENV"

namespace APITypes {
    export interface Entity {
        "kind": string,
        "etag": string,
    }

    export interface Response<T> extends Entity {
        "items": T[]
        "pageInfo": {
            "totalResults": number,
            "resultsPerPage": number
        }
    }

    export interface Thumbnail {
        "url": string
        "width": number
        "height": number
    }

    export interface VideoSnippet extends Entity {
        "id": string,
        "snippet": {
            "publishedAt": string,
            "channelId": string,
            "title": string,
            "description": string,
            "thumbnails": Record<"default" | "medium" | "high" | "standard", Thumbnail>,
            "channelTitle": string
            "tags": string[]
            "categoryId": string
            "liveBroadcastContent": unknown
            "localized": {
                "title": string
                "description": string
            }
        }
    }

    export interface VideoList extends Response<VideoSnippet> { }
}

export namespace YoutubeAdapter {
    export async function loadTrackInfo(id: string) {
        const response = await axios.get<APITypes.VideoList>(`https://youtube.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${ENV.API_KEY}`, {
            headers: {
                Accept: `application/json`
            }
        })

        const snippet = response.data.items[0]?.snippet

        if (!snippet) return null

        const iconURL = snippet.thumbnails.high.url
        const iconExtension = extname(iconURL)
        const icon = (await axios.get<ArrayBuffer>(iconURL, { responseType: "arraybuffer" })).data

        let label = snippet.title
        let author = snippet.channelTitle

        let isTopic = false
        {
            const [, newAuthor] = author.match(/(.+?) - Topic/) ?? []
            if (newAuthor) {
                author = newAuthor
                isTopic = true
            }
        }

        [label, author] = [label, author].map(v => v.replace(/'|"/g, ""))

        for (const brackets of ["()", "[]", "【】"]) {
            const regexp = new RegExp(`\\${brackets[0]}.+?\\${brackets[1]}`, "g")
            label = label.replace(regexp, "")
            author = author.replace(regexp, "")
        }

        label = label.replace(/#\w+/g, "")

        if (!isTopic) {
            let [, newAuthor, , newName] = label.match(/(.+?)(\s-\s|\s\|\s|::?\s|\sby\s)(.+)/) ?? []
            newAuthor = newAuthor?.trim()
            newName = newName?.trim()
            if (newAuthor && newName) {
                if (newName.toLowerCase().includes(author.toLowerCase())) {
                    [newAuthor, newName] = [newName, newAuthor]
                }
                author = newAuthor
                label = newName
            }
        }

        author = author.trim()
        label = label.trim()

        return { label, author, icon, iconExtension }
    }
}