var isBrowser = isBrowser || new Function('try {return this===window;}catch(e){ return false;}');
const g_isBrowser = isBrowser();
import nbpeer from "nbpeer"
export default class WalletHost {
    constructor() {
        this.eventCB = {}
    }
    async init({ appid }) {
        this.appid = appid
        this.approved = false
        this.id = Date.now().toString(36)
        this.eventCB = {}
        this.nbpeer = new nbpeer()
        await this.nbpeer.init()
        this.nbpeer.on("connectWallet", async (para) => {
            return await this.connectApp(para)
        })
        this.nbpeer.onElse((eName, ...argv) => {
            console.log("got nbpeer event:", eName, ...argv)
            this._fire(eName, ...argv)
        })
    }
    async connectApp(appInfo) {
        this.desid = appInfo.id
        const ret = await this._fire('session_request', appInfo.id, { name: 'pair_request', para: [appInfo] })
        if (ret.code != 0) {
            this.notify('rejected')
            return ret
        }
        this.notify('approved', { permissons: appInfo.permissions, wallet_id: this.id, key: this.nbpeer.getKey() })
        this.permissions = appInfo.permissions
        this.approved = true
        return { code: 0, msg: "approved" }
    }
    async pair(uri) {
        if (this.nbpeer) {
            this.disconnect()
        }
        const parseUrl = new URL(uri)
        const url_id = parseUrl.pathname
        const nbNode = parseUrl.searchParams.get('node')
        const path = parseUrl.searchParams.get('path')
        if (nbNode) {
            this.nbNode = nbNode
            const r = await this.nbpeer.create({ id: this.id, nbNode: this.nbNode, debug: true })
            await this.nbpeer.connectTo(url_id)
            if (r.code != 0) {
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
            return await this.connectApp(appInfo)
        }
        return { code: 1, msg: "invalid format" }
    }

    async getResult(...args) {
        const func = args[0]
        const para = args.slice(1)
        const request = { name: func, para }
        const res = await this.nbpeer.send(this.desid, "session_request", request)
        return res
    }
    notify(name, para) {
        this.desid && this.nbpeer.send(this.desid, 'session_notify', { name, para })
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
        if (typeof retFn == 'function') {
            retFn(ret)
        }
        return ret
    }

    async disconnect() {
        this.nbpeer.disconnect()
    }
}