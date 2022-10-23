var isBrowser = isBrowser || new Function('try {return this===window;}catch(e){ return false;}');
const g_isBrowser = isBrowser();

import qrModal from "@dwebpay/qrModal"
import nbpeer from "nbpeer"

let log = console.log;
export default class WalletApp {
    async init({ appid, bridge, debug = true }) {
        this.appid = appid
        this.nbNode = bridge
        this.debug = debug
        this.eventCB = {}
        this.id = Date.now().toString(36)
        const res = await fetch(bridge + "/api/q/" + appid)
        if (res.ok) {
            this.meta = await res.json()
        } else {
            console.error("can't fetch:", appid)
            return false
        }
        if (!debug) {

        }
        this.walletId = null
        this.nbpeer = new nbpeer()
        await this.nbpeer.init()
        this.modal = new qrModal({ bridge, debug })
        this.nbpeer.on('session_notify', (wallet_id, event) => {
            if (event.name === 'approved') {
                this.walletId = wallet_id
                console.log('got wallet id:', wallet_id)
                this.modal.close()
            }
            this._fire('session_notify', wallet_id, event)
        })
        //this.nbpeer.on('bridgeConnected', async () => {
        //    console.log('isConnected:', await this.isConnected({}))
        //})
        this.nbpeer.onElse((eName, ...args) => {
            console.log("got nbpeer event:", eName, ...args)
            this._fire(eName, ...args)
        })
        return true
    }

    async connect({ walletId, permissions }) {
        const options = { id: this.id, appid: this.appid, permissions }
        let res = await this.createSession()
        if (res.code == 0) {
            if (await this.isConnected({ walletId })) return { code: 0, msg: "connected" }
            if (res.code != 0 || !walletId) {
                const url = await this.optionsToUrl(options)
                const uri = `wp:${this.id}?node=${encodeURIComponent(this.nbNode)}&key=${this.nbpeer.getKey()}&path=${encodeURIComponent(url)}`
                console.log(uri)
                this.modal.show(uri, async (event, para) => {
                    console.log("event from modal:", event, para)
                    if (event === 'click') {
                        if (para === 'vbox') {
                            if (!window.VBox) {
                                alert('VBox is not found')
                                return
                            }
                            window.VBox.connect(uri)
                            return { code: 0 }
                        }
                    }
                })
            }
        }
        return res
    }

    async getBalance({ walletId, address, chain }) {
        return await this.getResult(walletId, 'getBalance', address, chain)
    }
    async getPubKey({ walletId, address, chain }) {
        return await this.getResult(walletId, 'getPubKey', address, chain)
    }
    async signTransaction({ walletId, options }) {
        return await this.getResult(walletId, 'signTransaction', options)
    }
    async sendTransaction({ walletId, options }) {
        return await this.getResult(walletId, 'sendTransaction', options)
    }
    async getAddresses({ walletId, chain }) {
        return await this.getResult(walletId, 'getAddresses', chain)
    }
    async getAccounts({ walletId, chain }) {
        return await this.getResult(walletId, 'getAccounts', chain)
    }
    async signMessage({ walletId, strData, chain }) {
        return await this.getResult(walletId, 'signMessage', strData, chain)
    }
    async decrypt({ walletId, data, chain }) {
        return await this.getResult(walletId, 'decrypt', data, chain)
    }
    async isConnected({ walletId = null }={}) {
        if (!walletId) walletId = this.walletId
        if (!walletId) return false
        const res = await this.nbpeer.send(walletId, "ping")
        return res === 'pong'
    }

    async getResult(walletId, ...args) {
        const func = args[0]
        const para = args.slice(1)
        const request = { name: func, para }
        if (!walletId) walletId = this.walletId
        //if (walletId === 'vbox') {
        //    return await window.VBox.getResult(func, ...para)
        //}
        const res = await this.nbpeer.send(walletId, "session_request", request)
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
        if (!this.nbpeer.isConnected()) {
            const res = await this.nbpeer.create({ id: this.id, nbNode: this.nbNode, debug: this.debug })
            return res
        }
        return { code: 0 }
    }
    notify(walletId, ...argv) {
        if (!walletId) walletId = this.walletId
        if (walletId === 'vbox') {
            window.VBox.notify(...argv)
        }
        this.nbpeer.send(walletId, 'notify', ...argv)
    }
}
