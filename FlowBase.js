const Extra = require('telegraf/extra');
const Markup = require('telegraf/markup');
const {capitalize} = require('./utils');

class FlowBase {
    constructor(def) {
        this.def = def;
        this.stateId = 'start';

        this.def.states.forEach(s => {
            if (!this[`get${capitalize(s.id)}Text`])
                this[`get${capitalize(s.id)}Text`] = () => s.text;
        })
    }

    async start(botCtx) {
        if (this.onStart)
            await this.onStart(botCtx);
        await this.reply(botCtx);
    }

    async setState(botCtx, stateId, flowCtx) {
        console.log(`Started transiting ${this.constructor.name} from ${this.stateId} to ${stateId}`);

        let leaveStateHandler = this[`onLeave${capitalize(this.stateId)}`];
        if (leaveStateHandler) {
            let result = await leaveStateHandler.call(this, flowCtx, botCtx);
            if (result === false) {
                console.log(`Leave handler blocked transition to state '${stateId}'`);
                return;
            }
        }

        this.stateId = stateId;

        let stateHandler = this[`on${capitalize(this.stateId)}`];
        if (stateHandler)
            stateHandler.call(this, flowCtx, botCtx);

        await this.reply(botCtx);

        console.log(`Completed transiting ${this.constructor.name} to ${this.stateId}`);

        if (this.stateDef.to)
            await this.setState(botCtx, this.stateDef.to, flowCtx);
    }

    async reply(botCtx, textOverride = null) {
        let text = textOverride || this.getStateText(botCtx);

        if (this.stateDef.beforeReply)
            this.stateDef.beforeReply(botCtx, text);

        if (this.stateDef.commands) {
            let buttons = this.stateDef.commands.map(cmd => cmd.name);
            let keyboard = Markup
                .keyboard(buttons, this.stateDef.layout || {columns: 2})
                .oneTime().resize().extra();

            if (this.stateDef.html)
                await botCtx.replyWithHTML(text, keyboard);
            else
                await botCtx.reply(text, keyboard);
        }
        else if (this.stateDef.actions) {
            let buttons = this.stateDef.actions.map((a, i) => Markup.callbackButton(a.name, `${this.stateId}-${i}`));
            let keyboard = Markup.inlineKeyboard(buttons, {columns: 2})
                .extra();

            if (this.stateDef.html)
                await botCtx.replyWithHTML(text, keyboard);
            else
                await botCtx.reply(text, keyboard);
        }
        else {
            if (this.stateDef.html)
                await botCtx.replyWithHTML(text);
            else
                await botCtx.reply(text);
        }

        if (this.stateDef.afterReply)
            this.stateDef.afterReply(botCtx, text);
    }

    getStateDef(stateId) {
        return this.def.states.find(s => s.id === stateId);
    }

    getStateText(botCtx) {
        return this[`get${capitalize(this.stateId)}Text`](botCtx);
    }

    get stateDef() {
        return this.def.states.find(s => s.id === this.stateId);
    }
}

module.exports = FlowBase;