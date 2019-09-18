const EventEmitter = require('events');
const firebase = require('firebase')

class SignalhubFB extends EventEmitter {
    constructor(app) {
        super();
        this.app = app
        this.setMaxListeners(0)
        this.subscribers = []
        this.closed = false
    }

    subscribe(channel) {
        if (this.closed) throw new Error('Cannot subscribe after close')

        const subscriber = new EventEmitter();
        const ref = firebase.database().ref(this.app).child(channel)
        let newData = false
        const fbsub = ref.on('value', (snap) => {
            //ignore existing data
            if (!newData) {
                newData = true
            }

            const val = snap.val()
            if (val) {
                subscriber.emit('data', val)
            }
        })
        subscriber.destroy = () => {
            ref.off('value', fbsub)
            ref.remove()
        }

        subscriber.once('close', () => {
            let i = this.subscribers.indexOf(subscriber)
            if (i > -1) this.subscribers.splice(i, 1)
        })

        process.nextTick(() => {
            subscriber.emit('open')
        })
        return subscriber
    }

    broadcast(channel, message, cb) {
        if (this.closed) throw new Error('Cannot broadcast after close')
        if (!cb) cb = noop

        if (message) {
            firebase.database().ref(this.app).child(channel).set(message, cb)
        }
    }

    close(cb) {
        if (this.closed) return
        this.closed = true

        if (cb) this.once('close', cb)
        let len = this.subscribers.length
        if (len > 0) {
            let closed = 0
            this.subscribers.forEach((subscriber) => {
                subscriber.once('close', () => {
                    if (++closed === len) {
                        this.emit('close')
                    }
                })
                process.nextTick(() => {
                    subscriber.destroy()
                })
            })
        } else {
            this.emit('close')
        }
    }

}

function noop() { }

module.exports = (projectId, apiKey) => {
    if (!projectId) throw new Error('project id is required')
    if (!apiKey) throw new Error('api key is required')

    firebase.initializeApp({
        projectId: projectId,
        apiKey: apiKey,
        databaseURL: projectId + ".firebaseio.com"
    });

    return (app) => {
        return new SignalhubFB(app)
    }
}