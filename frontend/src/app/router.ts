import { h } from "vue"
import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router"
import { HomeScreen } from "../frontend/HomeScreen"
import { useTitle } from "../frontend/useTitle"

const routes: RouteRecordRaw[] = [
    {
        name: "Home",
        component: HomeScreen,
        path: "/"
    },
    {
        name: "404",
        component: { setup: () => (useTitle("Not found"), () => h("pre", { class: "m-4" }, "Page not found")) },
        path: "/:page(.*)*"
    }
]

export const router = createRouter({
    history: createWebHistory(),
    routes
})