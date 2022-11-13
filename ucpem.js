/// <reference path="./.vscode/config.d.ts" />

const { project, github, include } = require("ucpem")

include("frontend/ucpem.js")

project.prefix("src").res("common",
    github("bt7s7k7/Struct").res("structSync"),
    github("bt7s7k7/CommonTypes").res("comTypes"),
)
project.prefix("src").res("backend",
    project.ref("common"),
    github("bt7s7k7/SimpleServer").res("simpleDB"),
    github("bt7s7k7/LogLib").res("nodeLogger"),
    github("bt7s7k7/AdminGUI").res("adminUIClient")
)
