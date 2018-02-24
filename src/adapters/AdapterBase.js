class AdapterBase {
    connect() {
    }

    onStart(handler) {
    }

    onText(pattern, handler) {
    }

    onAction(pattern, handler) {
    }

    onError(handler) {
    }

    async message(recipient, msg, additional) {
    }

    async messageMarkup(recipient, msg, additional) {
    }

    get nativeBot() {
        return null;
    }
}

module.exports = AdapterBase;