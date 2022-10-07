export class Util {
    static async loadScript(url) {
        return new Promise(resolve => {
            var script = document.createElement("script")
            script.type = "text/javascript";
            script.onload = function () { resolve(true) };
            script.onerror = () => { console.error("error loading" + url); resolve(false) }
            script.src = url;
            document.getElementsByTagName("head")[0].appendChild(script);
        })
    }
}