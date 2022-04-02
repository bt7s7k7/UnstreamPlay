import { mdiOpenInNew, mdiPlaylistPlus } from "@mdi/js"
import { defineComponent, h, ref } from "vue"
import { Track } from "../../common/Track"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { TextField } from "../../vue3gui/TextField"
import { PlaylistInclusionForm } from "../playlist/PlaylistInclusionForm"
import { STATE } from "../State"

export const TrackView = (defineComponent({
    name: "TrackView",
    props: {
        track: { type: Track, required: true }
    },
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        function openPlaylistSettings() {
            emitter.modal(PlaylistInclusionForm, {
                contentProps: { track: props.track, class: "flex-fill" },
                props: {
                    class: "w-300 h-500",
                    cancelButton: "Close"
                }
            })
        }

        async function editLabel(event: MouseEvent) {
            const label = ref(props.track.label)
            const popup = await emitter.popup(event.target as HTMLElement, () => (
                <TextField focus class="w-200" vModel={label.value} />
            ), {
                align: "over",
                props: {
                    backdropCancels: true
                }
            })

            if (popup && label.value) {
                await STATE.trackEditor.setTrackLabel({ track: props.track.id, label: label.value })
                props.track.label = label.value
                STATE.onPlaylistsProbablyChanged.emit()
            }
        }

        async function editAuthor(event: MouseEvent) {
            const author = ref(props.track.author)
            const popup = await emitter.popup(event.target as HTMLElement, () => (
                <TextField focus class="w-200" vModel={author.value} />
            ), {
                align: "over",
                props: {
                    backdropCancels: true
                }
            })

            if (popup && author.value) {
                await STATE.trackEditor.setTrackAuthor({ track: props.track.id, author: author.value })
                props.track.author = author.value
                STATE.onPlaylistsProbablyChanged.emit()
            }
        }

        return () => (
            <div class="flex column">
                <div class="as-track-icon w-fill mb-4">
                    <img src={`/icons/${props.track.icon}`} class="absolute-fill img-cover" />
                </div>
                {ctx.slots.default && h(ctx.slots.default)}
                <div>
                    <small>Track:</small>
                    <Button onClick={editLabel} clear><h3 class="m-0">{props.track.label}</h3></Button>
                    <Button clear href={`https://www.youtube.com/watch?v=${props.track.id}`}> <Icon icon={mdiOpenInNew} /> </Button>
                    <Button clear onClick={openPlaylistSettings}> <Icon icon={mdiPlaylistPlus} /> </Button>
                </div>
                <div>
                    <small>Artist:</small>
                    <Button onClick={editAuthor} clear><h3 class="m-0">{props.track.author}</h3></Button>
                </div>
                <div>
                </div>
            </div>
        )
    }
}))