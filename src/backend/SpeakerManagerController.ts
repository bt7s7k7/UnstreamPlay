import { SpeakerManagerContract } from "../common/Speaker"
import { MultiMap } from "../comTypes/MultiMap"
import { joinIterable, makeRandomID } from "../comTypes/util"
import { ClientError } from "../structSync/StructSyncServer"
import { StructSyncSession } from "../structSync/StructSyncSession"

export const VOWELS = "aeiou"
export const CONSONANTS = "bcdfgjklmnpqstvxzhrwy"

function makeSpeakerLabel() {
    let isVowel = Math.random() > 0.5
    let result = ""
    for (let i = 0; i < 6; i++) {
        const src = isVowel ? VOWELS : CONSONANTS
        let letter = src[Math.floor(Math.random() * src.length)]
        if (i == 0) letter = letter.toUpperCase()
        result += letter

        isVowel = !isVowel
    }

    return result
}

export interface SpeakerInfo {
    id: string
    owner: StructSyncSession
    label: string
    connected: Set<StructSyncSession>
}

interface SessionSpeakerState {
    isOwner: boolean
    speaker: SpeakerInfo
}

export class SpeakerManagerController extends SpeakerManagerContract.defineController() {
    public speakerLookup = new MultiMap(MultiMap.entity<SpeakerInfo>(), {
        id: MultiMap.key<string>(),
        owner: MultiMap.key<StructSyncSession>(),
        connected: MultiMap.multipleKey<StructSyncSession>()
    })

    public impl = super.impl({
        init: async (_, meta) => {
            const curr = this.getSessionSpeakerState(meta.session)
            if (curr) throw new ClientError("Cannot create a speaker, already connected to a speaker")
            const label = makeSpeakerLabel()

            const speaker: SpeakerInfo = {
                id: makeRandomID(),
                owner: meta.session,
                connected: new Set(),
                label
            }

            this.setSessionSpeakerState(meta.session, { isOwner: true, speaker })

            return { label }
        },
        connect: async ({ speaker: speakerID }, meta) => {
            const curr = this.getSessionSpeakerState(meta.session)
            if (curr) throw new ClientError("Cannot connect to speaker, already connected to a speaker")
            const speaker = this.speakerLookup.tryGet("id", speakerID)
            if (speaker == null) throw new ClientError(`Cannot find speaker "${speakerID}"`)

            this.setSessionSpeakerState(meta.session, { isOwner: false, speaker })
        },
        disconnect: async (_, meta) => {
            const curr = this.getSessionSpeakerState(meta.session)
            if (curr == null) throw new ClientError("Cannot disconnect from speaker, not connected")

            this.setSessionSpeakerState(meta.session, null)
        },
        sendSync: async (msg, meta) => {
            const state = this.getSessionSpeakerState(meta.session)
            if (state == null) throw new ClientError("Cannot sync with speaker, not connected")

            const msgSerialized = msg == null ? null : msg.serialize()

            for (const target of joinIterable(state.speaker.connected, [state.speaker.owner])) {
                if (target == meta.session) continue

                target.emitEvent({
                    type: "event",
                    event: "onSync",
                    payload: msgSerialized,
                    target: EVENT_TARGET
                })
            }
        }
    })

    public getSessionSpeakerState(session: StructSyncSession): SessionSpeakerState | null {
        const owned = this.speakerLookup.tryGet("owner", session)
        if (owned) return { isOwner: true, speaker: owned }

        const connected = this.speakerLookup.tryGet("connected", session)
        if (connected) return { isOwner: false, speaker: connected }

        return null
    }

    public setSessionSpeakerState(session: StructSyncSession, state: SessionSpeakerState | null) {
        const curr = this.getSessionSpeakerState(session)
        if (curr != null) {
            if (curr.isOwner) {
                this.speakerLookup.delete(curr.speaker)
                this.mutate(v => v.speakers.delete(curr.speaker.id))

                for (const connected of curr.speaker.connected) {
                    this.setSessionSpeakerState(connected, null)
                }
            } else {
                curr.speaker.connected.delete(session)

                // Hack to fix crash, sometimes update says entity is not stored, idk
                if (this.speakerLookup.has(curr.speaker)) return
                this.speakerLookup.update(curr.speaker)
            }

            session.notifyMutation({ type: "mut_assign", target: EVENT_TARGET, key: "connected", value: null, path: [] })

            if (!curr.isOwner) {
                session.emitEvent({
                    type: "event",
                    event: "onDestroy",
                    payload: null,
                    target: EVENT_TARGET
                })
            }
        }

        if (state == null) return

        if (state.isOwner) {
            this.speakerLookup.add(state.speaker)
            this.mutate(v => v.speakers.set(state.speaker.id, state.speaker.label))
        } else {
            state.speaker.connected.add(session)
            this.speakerLookup.update(state.speaker)
        }

        session.notifyMutation({ type: "mut_assign", target: EVENT_TARGET, key: "connected", value: { isOwner: state.isOwner, id: state.speaker.id }, path: [] })
    }
}

const EVENT_TARGET = SpeakerManagerController.baseType.name