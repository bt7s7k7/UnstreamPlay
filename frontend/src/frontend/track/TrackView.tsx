import { mdiOpenInNew, mdiPencil, mdiPlaylistPlus } from "@mdi/js"
import { defineComponent, ref } from "vue"
import { unreachable } from "../../comTypes/util"
import { Track } from "../../common/Track"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { TextField } from "../../vue3gui/TextField"
import { STATE } from "../State"
import { getIconURL } from "../constants"
import { PlaylistInclusionForm } from "../playlist/PlaylistInclusionForm"
import { useIconSelection } from "./IconSelection"

export const TrackView = (defineComponent({
    name: "TrackView",
    props: {
        track: { type: Track, required: false }
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
            if (props.track == null) return

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
            if (props.track == null) return

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

        const iconSelect = useIconSelection(async (icon) => {
            await STATE.trackEditor.setTrackIcon({ track: props.track?.id ?? unreachable(), icon })
            props.track!.icon = icon ?? ""
        })

        return () => (
            <div class="flex column">
                <div class="w-fill flex column center bg-black">
                    <div class="as-track-icon w-fill hover-check">
                        <img src={getIconURL(props.track?.icon)} class="absolute-fill img-cover bg-black" />
                        {props.track != null && (
                            <Button clear class="absolute if-hover-fade bg-black-transparent right-0 bottom-0" onClick={iconSelect}> <Icon icon={mdiPencil} /> </Button>
                        )}
                    </div>
                </div>
                {ctx.slots.default ? ctx.slots.default?.() : <div class="mt-4"></div>}
                {props.track != null && (
                    <div class={ctx.slots.default != null && "px-4"}>
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
                    </div>
                )}
                <div>
                </div>
            </div>
        )
    }
}))
