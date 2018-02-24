const Stack = require('./Stack');

class FlowController {
    constructor() {
        this.userContext = {};
        this.storage = null;
        this.adapters = [];
        this.errorHandler = error => console.log(error);
    }

    useStorage(storage) {
        this.storage = storage;
    }

    useAdapter(adapter) {
        this.adapters.push(adapter);
    }

    userErrorHandler(errorHandler) {
        this.errorHandler = errorHandler;
    }

    start(flowClass) {
        this.storage.init();
        this.flowClass = flowClass;

        this.adapters.forEach(adapter => {
            adapter.onError(async error => {
                await this.errorHandler(error);
            });

            adapter.onStart(async (conv, peer) => {
                let flow = new this.flowClass();
                this.pushFlow(peer.id, flow);

                let user = await this.storage.User.findOne({
                    where: {peerId: peer.id}
                });

                if (!user) {
                    user = await this.storage.User.create({
                        adapter: adapter.constructor.name,
                        peerId: peer.id,
                        userName: peer.userName,
                        firstName: peer.firstName,
                        lastName: peer.lastName,
                        url: peer.url,
                        connectedAt: new Date(),
                        activeAt: new Date()
                    });

                    let account = await this.storage.Account.create({
                        userId: user.get('id'),
                        balance: 0
                    });
                }

                await flow.start({
                    user,
                    conv,
                    adapter,
                    storage: this.storage
                });

                user.activeAt = new Date();
                await user.save();
            });

            adapter.onText(async (conv, text, peer) => {
                let flow = this.peekFlow(peer.id);
                if (!flow) return;

                console.log(`Using flow ${flow.constructor.name} in state ${flow.state.id} for peer #${peer.id}`);

                let user = await this.storage.User.findOne({
                    where: {peerId: peer.id}
                });

                if (flow.state.commands) {
                    let transition = flow.state.commands
                        .find(cmd => cmd.id === text || cmd.text === text);

                    if (transition) {
                        if (transition.start) {
                            let flow = new transition.start();

                            console.log(`Pushing new flow ${flow.constructor.name} for peer #${peer.id}`);

                            this.pushFlow(peer.id, flow);
                            await flow.start({
                                user,
                                conv,
                                adapter,
                                storage: this.storage
                            });
                        }
                        else if (transition.to) {
                            await flow.setState(transition.to, {
                                user,
                                conv,
                                adapter,
                                storage: this.storage,
                                transition
                            });

                            if (flow.state.start) {
                                let newFlow = new flow.state.start();

                                this.pushFlow(peer.id, newFlow);
                                await newFlow.start({
                                    user,
                                    conv,
                                    adapter,
                                    storage: this.storage
                                });
                            }
                            else if (flow.state.goBack) {
                                this.popFlow(peer.id);
                                let newFlow = this.peekFlow(peer.id);

                                await newFlow.start({
                                    user,
                                    conv,
                                    adapter,
                                    storage: this.storage
                                });
                            }
                        }
                        else if (transition.goBack) {
                            this.popFlow(peer.id);
                            let newFlow = this.peekFlow(peer.id);

                            await newFlow.start({
                                user,
                                conv,
                                adapter,
                                storage: this.storage
                            });
                        }
                    }
                }
                else if (flow.state.input) {
                    let isValid = flow.state.input.validate
                        ? await flow.state.input.validate(text)
                        : true;

                    if (isValid) {
                        await flow.setState(flow.state.input.to, {
                            user,
                            conv,
                            adapter,
                            storage: this.storage,
                            transition: {
                                ...flow.state.input,
                                text
                            }
                        });

                        if (flow.state.start) {
                            let newFlow = new flow.state.start();

                            this.pushFlow(peer.id, newFlow);
                            await newFlow.start(conv);
                        }
                        else if (flow.state.goBack) {
                            this.popFlow(peer.id);
                            let newFlow = this.peekFlow(peer.id);

                            await newFlow.start(conv);
                        }
                    } else {
                        await conv.reply(
                            flow.state.input.validationMessage ||
                            'Введённое значение имеет неверный формат');
                    }
                }

                user.activeAt = new Date();
                await user.save();
            });

            adapter.onAction(async (conv, action, peer) => {
                let flow = this.peekFlow(peer.id);
                if (!flow) return;

                console.log(`Using flow ${flow.constructor.name} in state ${flow.state.id} for peer #${peer.id}`);

                let user = await this.storage.User.findOne({
                    where: {peerId: peer.id}
                });

                let actionId = action;
                if (flow.state.actions) {
                    let transition = flow.state.actions
                        .find((a, i) => a.id === actionId);

                    if (transition && transition.callback)
                        await transition.callback({action: transition}, conv);

                    if (transition && transition.start) {
                        let flow = new transition.start();

                        this.pushFlow(peer.id, flow);
                        await flow.start({
                            user,
                            conv,
                            adapter,
                            storage: this.storage
                        });
                    }
                    else if (transition && transition.to) {
                        await flow.setState(transition.to, {
                            user,
                            conv,
                            adapter,
                            storage: this.storage,
                            transition
                        });

                        if (flow.state.start) {
                            let newFlow = new flow.state.start();

                            this.pushFlow(peer.id, newFlow);
                            await newFlow.start({
                                user,
                                conv,
                                adapter,
                                storage: this.storage
                            });
                        }
                        else if (flow.state.goBack) {
                            this.popFlow(peer.id);
                            let newFlow = this.peekFlow(peer.id);

                            await newFlow.start({
                                user,
                                conv,
                                adapter,
                                storage: this.storage
                            });
                        }
                    }
                    else if (transition && transition.goBack) {
                        this.popFlow(peer.id);
                        let newFlow = this.peekFlow(peer.id);

                        await newFlow.start({
                            user,
                            conv,
                            adapter,
                            storage: this.storage
                        });
                    }
                }

                user.activeAt = new Date();
                await user.save();
            });

            adapter.connect();
        });
    }

    peekFlow(userId) {
        if (!this.storage[userId])
            this.storage[userId] = new Stack();
        return this.storage[userId].peek() || new this.flowClass();
    }

    popFlow(userId) {
        if (!this.storage[userId])
            this.storage[userId] = new Stack();
        return this.storage[userId].pop() || new this.flowClass();
    }

    pushFlow(userId, flow) {
        if (!this.storage[userId])
            this.storage[userId] = new Stack();
        this.storage[userId].push(flow);
    }
}

module.exports = FlowController;