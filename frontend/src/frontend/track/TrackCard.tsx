import { mdiPencil } from "@mdi/js"
import { defineComponent } from "vue"
import { useRouter } from "vue-router"
import { Track } from "../../common/Track"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { getIconURL } from "../constants"
import { TrackView } from "./TrackView"

export const TrackCard = (defineComponent({
    name: "TrackCard",
    props: {
        track: { type: Track, required: true },
        to: { type: String }
    },
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()
        const router = useRouter()

        async function editTrack() {
            emitter.modal(TrackView, {
                contentProps: { track: props.track },
                props: {
                    cancelButton: "Close",
                    class: "w-500 h-700"
                }
            })
        }

        function navigate() {
            if (props.to) router.push(props.to)
        }

        return () => (
            <Button onClick={navigate} clear class="flex column text-left gap-1 hover-check">
                <div class="as-track-icon w-150">
                    <img src={getIconURL(props.track.icon)} class="img-cover absolute-fill" />
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