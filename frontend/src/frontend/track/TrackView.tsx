import { defineComponent } from "vue"
import { Track } from "../../common/Track"

export const TrackView = (defineComponent({
    name: "TrackView",
    props: {
        track: { type: Track, required: true }
    },
    setup(props, ctx) {
        return () => (
            <div class="flex column">
                <img src={props.track.icon} />
            </div>
        )
    }
}))