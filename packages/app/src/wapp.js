var isBrowser = isBrowser || new Function('try {return this===window;}catch(e){ return false;}');
const g_isBrowser = isBrowser();

import qrModal from "@dwebpay/qrModal"
import nbpeer from "nbpeer"

var qrTermila;
let log = console.log;
const PERM = ["ACCESS_ADDRESS", "ACCESS_PUBLIC_KEY", "ACCESS_ACCOUNT", "ACCESS_BALANCE", "SIGN_TRANSACTION", "DISPATCH", "ENCRYPT", "DECRYPT", "SIGN_MESSAGE"]
export class WalletApp {
    constructor() {
        this.lastChecking = 0
        console.log('app@dwebpay: [VI]{version} - {date}[/VI]');
    }
    async init({ appid, bridge, debug = true }) {
        this.appid = appid
        this.nbNode = bridge
        this.debug = debug
        this.eventCB = {}
        this.id = Date.now().toString(36)
        if (!g_isBrowser) {
            global.fetch = require("cross-fetch")
            qrTermila = require('qrcode-terminal');
        }
        const res = await fetch(bridge + "/api/q/" + appid)
        if (res.ok) {
            this.meta = await res.json()
        } else {
            console.error("can't fetch:", appid, "from:", bridge)
            return false
        }
        if (this.meta.allowSite && !debug) { //
            const cursite = window.location.href
        }
        this.walletId = localStorage.getItem("walletId")
        this.nbpeer = new nbpeer()
        await this.nbpeer.init()
        this.modal = new qrModal({ bridge, debug })

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
        const self = this
        return new Promise(async resolve => {
            const options = { id: this.id, appid: this.appid, permissions }
            const access = permissions.access
            if (!access || access.length == 0)
                return { code: 1, msg: "permissions.access are missing" }
            for (const elm of access) {
                if (PERM.indexOf(elm) === -1) return { code: 1, msg: "invalid access:", elm }
            }
            let res = await this.createSession()
            if (res.code == 0) {
                this.nbpeer.on('session_notify', (wallet_id, event) => {
                    if (event.name === 'approved') {
                        self.walletId = wallet_id
                        console.log('got wallet id:', wallet_id)
                        localStorage.setItem("walletId", wallet_id)
                        self.modal.close()
                        resolve({ code: 0, wallet_id, msg: "approved" }); return
                    }
                    self._fire('session_notify', wallet_id, event)
                })
                if (await this.isConnected({ walletId })) {
                    resolve({ code: 0, msg: "connected" }); return
                }

                const url = await this.optionsToUrl(options)
                const uri = `wp:${this.id}?node=${encodeURIComponent(this.nbNode)}&cmd=connect&key=${this.nbpeer.getKey()}&path=${encodeURIComponent(url)}`
                console.log(uri)
                if (g_isBrowser) {
                    this.modal.show(uri, async (event, para) => {
                        console.log("event from modal:", event, para)
                        if (event === 'closed') {
                            resolve({ code: 1, msg: "Cancelled" })
                            return
                        }
                        if (event === 'clickWallet' && para === 'vbox') {
                            if (!window.VBox) {
                                resolve({ code: 1, msg: "VBox is not found" });
                                return
                            }
                            window.VBox.connect(uri)
                        }
                    })
                } else { //node envirment, show terminal qrcode
                    qrTermila.generate(uri, { small: true });
                }
            }
        })
    }

    async getBalance({ walletId, address, chain }) {
        return await this.getResult(walletId, 'getBalance', { address, chain })
    }
    async getPubKey({ walletId, address, chain }) {
        return await this.getResult(walletId, 'getPubKey', { address, chain })
    }
    async signTransaction({ walletId, options }) {
        return await this.getResult(walletId, 'signTransaction', { options })
    }
    async sendTransaction({ walletId, options }) {
        return await this.getResult(walletId, 'sendTransaction', { options })
    }
    async getActiveAddress({ walletId }) {
        return await this.getResult(walletId, 'getActiveAddress')
    }
    async getAddresses({ walletId, chain }) {
        return await this.getResult(walletId, 'getAddresses', { chain })
    }
    async getAccounts({ walletId, chain }) {
        return await this.getResult(walletId, 'getAccounts', { chain })
    }
    async signMessage({ walletId, message, address, chain }) {
        return await this.getResult(walletId, 'signMessage', { message, address, chain })
    }
    async decrypt({ walletId, data, address, chain }) {
        return await this.getResult(walletId, 'decrypt', { data, address, chain })
    }
    async encrypt({ walletId, data, address, chain }) {
        return await this.getResult(walletId, 'encrypt', { data, address, chain })
    }
    async rsaDecrypt({ walletId, data, address, chain }) {
        return await this.decrypt({ walletId, data, address, chain })
    }
    async rsaEncrypt({ walletId, data, address, chain }) {
        return await this.encrypt({ walletId, data, address, chain })
    }
    async isConnected({ walletId = null } = {}) {
        if (!walletId) walletId = this.walletId
        if (!walletId) return false
        const span = Date.now() - this.lastChecking
        if (span > 1000 * 5) {
            this.lastChecking = Date.now()
            if (this.nbpeer.isConnected()) {
                const res = await this.nbpeer.send(walletId, "ping")
                this.connected = (res === 'pong')
            } else {
                this.connected = false
            }
        }
        return this.connected
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

export class ARAdaptor {
    connect(permissions, appInfo, gateway) {
        console.log('ARAdaptor.connect:', permissions, appInfo, gateway)
    }
}