var isBrowser = isBrowser || new Function('try {return this===window;}catch(e){ return false;}');
const g_isBrowser = isBrowser();
let g_initLib = false
var fetch = (typeof (window) === 'undefined') ? null : window.fetch;
import nbpeer from "nbpeer"
export default class WalletHost {
    static async initLib() {
        if (!g_initLib) {
            if (!g_isBrowser) {
                fetch = require('cross-fetch')
            }
            g_initLib = true
        }
    }
    constructor() {
        this.eventCB = {}
        this.connections = {}
        console.log('wallet@dwebpay: [VI]{version} - {date}[/VI]');
    }
    async init({ appid, debug }) {
        await WalletHost.initLib()
        this.appid = appid
        this.approved = false
        this.debug = debug
        this.id = localStorage.getItem("walletHostId")
        if (!this.id) {
            this.id = Date.now().toString(36)
            localStorage.setItem("walletHostId", this.id)
        }
        await nbpeer.initLib()
    }
    connectionFromId(appid) {
        for (const node in this.connections) {
            const peer = this.connections[node]
            if (peer.apps[appid]) return peer
        }
        return null
    }
    async getConnection(nbNode) {
        let peer = this.connections[nbNode]
        if (peer && peer.isConnected()) {
            return peer
        }
        peer = new nbpeer()
        if (await peer.init()) {
            const r = await peer.create({ id: this.id, nbNode, debug: this.debug })
            if (r.code != 0) {
                console.error("cannot connect to node:", nbNode)
                return null
            }
            this.connections[nbNode] = peer
            peer.on("connectWallet", async (para) => {
                return await this.connectApp(para)
            })
            peer.on("ping", () => {
                return "pong"
            })
            peer.onElse(async (eName, ...argv) => {
                console.log("got nbpeer event:", eName, ...argv)
                return await this._fire(eName, ...argv)
            })
            return peer
        }
        console.error("peer.init failed")
        return null
    }

    async connectApp(appInfo, peer) {
        const ret = await this._fire('session_request', appInfo.id, { name: 'pair_request', para: [appInfo] })
        if (ret.code != 0) {
            this.notify(appInfo.id, 'rejected')
            return ret
        }

        this.notify(appInfo.id, 'approved', { permissons: appInfo.permissions, wallet_id: this.id, key: peer.getKey() })
        this.permissions = appInfo.permissions
        this.approved = true
        return { code: 0, msg: "approved" }
    }
    async pair(uri) {
        const parseUrl = new URL(uri)
        const url_id = parseUrl.pathname
        const nbNode = parseUrl.searchParams.get('node')
        const path = parseUrl.searchParams.get('path')
        if (nbNode) {
            const peer = await this.getConnection(nbNode)
            if (!peer) {
                return { code: 1, msg: "cannot connect to node:", nbNode }
            }
            const res = await fetch(nbNode + path)
            if (!res.ok) {
                return { code: 1, msg: "cannot fetch:" + nbNode + path }
            }
            const appInfo = await res.json()
            console.log(appInfo)
            if (url_id != appInfo.id) {
                return { code: 1, msg: "invalid id" }
            }
            if (await peer.connectTo(url_id)) {
                if (!peer.apps) peer.apps = {}
                peer.apps[appInfo.id] = appInfo
            } else {
                console.error("cannot connect to:", url_id)
                return
            }
            return await this.connectApp(appInfo, peer)
        }
        return { code: 1, msg: "invalid format" }
    }

    async getResult(...args) {
        const fromId = args[0]
        const func = args[1]
        const para = args.slice(2)
        const request = { name: func, para }
        const res = await this.nbpeer.send(fromId, "session_request", request)
        return res
    }
    notify(fromId, name, para) {
        const peer = this.connectionFromId(fromId)
        if (!peer) {
            console.error("peer for", fromId, " is not found")
            return
        }
        peer.send(fromId, 'session_notify', { name, para })
    }
    on(eventName, cb) {
        this.eventCB[eventName] = cb
    }
    onElse(cb) {
        this.eventCB['_any'] = cb
    }
    async _fire(name, ...argv) {
        const cb = this.eventCB[name]
        const cb1 = this.eventCB['_any']
        const ret = cb ? await cb(...argv) : (cb1 ? await cb1(name, ...argv) : null)
        const retFn = argv[argv.length - 1]
        /*if (typeof retFn == 'function') {
            retFn(ret)
        }*/
        return ret
    }

    async disconnect() {
        this.nbpeer.disconnect()
    }
}