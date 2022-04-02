import { mdiPencil } from "@mdi/js"
import { defineComponent } from "vue"
import { Track } from "../../common/Track"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { TrackView } from "./TrackView"

export const TrackCard = (defineComponent({
    name: "TrackCard",
    props: {
        track: { type: Track, required: true }
    },
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        async function editTrack() {
            emitter.modal(TrackView, {
                contentProps: { track: props.track },
                props: {
                    cancelButton: "Close",
                    class: "w-500 h-700"
                }
            })
        }

        return () => (
            <Button clear class="flex column text-left gap-1 hover-check">
                <div class="as-track-icon w-150">
                    <img src={`/icons/${props.track.icon}`} class="img-cover absolute-fill" />
                    <div class="absolute right-0 bottom-0">
                        <Button onClick={editTrack} flat class="bg-black-transparent if-hover-fade" variant="black"> <Icon icon={mdiPencil} /> </Button>
                    </div>
                </div>
                <div class="w-150">{props.track.label}</div>
                <small class="w-150">{props.track.author}</small>
            </Button>
        )
    }
}))