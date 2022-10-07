var isBrowser = isBrowser || new Function('try {return this===window;}catch(e){ return false;}');
const g_isBrowser = isBrowser();

import qrModal from "@walletpay/qrModal"
import nbpeer from "nbpeer"

let log = console.log;
export default class WalletApp {
    async init({ appid, nbNode, debug }) {
        this.appid = appid
        this.nbNode = nbNode
        this.debug = debug
        this.eventCB = {}
        this.id = Date.now().toString(36)
        this.nbpeer = new nbpeer()
        await this.nbpeer.init()
        this.modal = new qrModal({ nbNode })
        this.nbpeer.on('session_event', (event) => {
            if (event.name === 'approved') {
                this.desid = event.para.wallet_id
                this.nbpeer.setEncryptKey(event.para.key)
                console.log('got wallet id:', this.desid)
                this.modal.close()
            }
            this._fire('session_event', event)
        })
        this.nbpeer.onElse((eName, ...args) => {
            console.log("got nbpeer event:", eName, ...args)
            this._fire(eName, ...args)
        })
    }
    async connect({ permissions }) {
        const options = { id: this.id, appid: this.appid, permissions }
        let res = await this.createSession()
        if (res.code == 0) {
            if (this.desid) {
                res = await this.getResult('connectWallet', options)
                console.log(res)
            }
            if (res.code != 0 || !this.desid) {
                const url = await this.optionsToUrl(options)
                const uri = `wp:${this.id}?node=${encodeURIComponent(this.nbNode)}&key=${this.nbpeer.getKey()}&path=${encodeURIComponent(url)}`
                console.log(uri)
                this.modal.show(uri, async (event, para) => {
                    console.log("event from modal:", event, para)
                    if (event === 'click') {
                        if (para === 'vbox') {
                            vbox.connect(options)
                        }
                    }
                    //return await this._fire(event, para)
                })
            }

        }
        return { code: 0 }
    }

    async getBalance(address, chain) {
        return await this.getResult('getBalance', address, chain)
    }
    async sendTransaction(option, chain) {
        return await this.getResult('sendTransaction', option, chain)
    }
    async getResult(...args) {
        const func = args[0]
        const para = args.slice(1)
        const request = { name: func, para }
        if (this.desid === 'vbox') {
            return await vbox.invoke(func, ...para)
        }
        const res = await this.nbpeer.send(this.desid, "session_request", request)
        return res
    }
    on(eventName, cb) {
        this.eventCB[eventName] = cb
    }
    onElse(cb) {
        this.eventCB['_any'] = cb
    }
    async _fire(name, ...args) {
        const cb = this.eventCB[name]
        const cb1 = this.eventCB['_any']
        return cb ? await cb(...args) : (cb1 ? await cb1(name, ...args) : null)
    }
    async disconnect() {
        this.nbpeer.disconnect()
        this.id = null
    }
    async optionsToUrl(options) {
        const saveURL = "/api/relay/save";
        const getURL = "/api/relay/get/";
        const res = await fetch(this.nbNode + saveURL, {
            method: "post",
            headers: {
                Accept: "application/json, text/plain, */*",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(options),
        })
        return res.ok ? getURL + options.id : null
    }
    async createSession() {
        if (!this.relaySocket) {
            await this.updateNode()
        }
        if (!this.relaySocket) return { code: 1, msg: "invalid or offline nbNode" }
        if (!this.nbpeer.isConnected()) {
            const res = await this.nbpeer.create({ id: this.id, node: this.relaySocket, debug: this.debug })
            return res
        }
        return { code: 0 }
    }
    notify(...argv) {
        if (this.desid === 'vbox') {
            vbox.notify(...argv)
        }
        this.desid && this.nbpeer.send(this.desid, 'notify', ...argv)
    }
    async updateNode(nbNode) {
        if (!nbNode) nbNode = this.nbNode
        let res = await fetch(nbNode + "/api/nodeinfo")
        if (res.ok) {
            const info = await res.json()
            const pUrl = g_isBrowser ? new URL(nbNode) : URL.parse(url)
            this.relaySocket = "ws://" + pUrl.hostname + ":" + (info.socketPort || 31415)
            if (info.socketServer) {
                relaySocket = "ws://" + info.socketServer + ":" + (info.socketPort || 31415)
            }
            this.nbNode = nbNode
            return true
        }
        return false
    }
    test() {
        const pay = new qrModal()
        pay.show("wp:dfafsdf&id=123&key=fsfsf", (event, para) => {
            console.log(event, para)
        })
    }
}
