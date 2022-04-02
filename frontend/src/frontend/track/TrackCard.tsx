import { defineComponent } from "vue"
import { Track } from "../../common/Track"
import { Button } from "../../vue3gui/Button"

export const TrackCard = (defineComponent({
    name: "TrackCard",
    props: {
        track: { type: Track, required: true }
    },
    setup(props, ctx) {
        return () => (
            <Button clear class="flex column text-left gap-1">
                <img src={`/icons/${props.track.icon}`} class="as-track-icon w-150" />
                <div class="w-150">{props.track.label}</div>
                <small class="w-150">{props.track.author}</small>
            </Button>
        )
    }
}))