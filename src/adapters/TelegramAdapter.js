const Telegraf = require('telegraf');
const Markup = require('telegraf/markup');
const AdapterBase = require('./AdapterBase');
const CommandSet = require('../CommandSet');
const ActionSet = require('../ActionSet');

const mapExtra = obj => {
    if (obj instanceof CommandSet)
        return Markup
            .keyboard(obj.commands.map(x => x.text), {columns: 2})
            .oneTime().resize().extra();

    if (obj instanceof ActionSet)
        return Markup
            .inlineKeyboard(obj.actions.map(x => x.url
                ? Markup.urlButton(x.text, x.url)
                : Markup.callbackButton(x.text, x.id)))
            .extra()
};

class TelegramConversation {
    constructor(ctx) {
        this.ctx = ctx;
        this.peer = {
            id: ctx.from.id,
            userName: ctx.from.username,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name,
            url: `https://t.me/${ctx.from.username}`
        }
    }

    async reply(msg, extra) {
        await this.ctx.reply(msg, mapExtra(extra));
    }

    async replyMarkup(msg, extra) {
        await this.ctx.replyWithHTML(msg, mapExtra(extra))
    }

    async alert(msg) {
        await this.ctx.answerCbQuery(msg);
    }

    get text() {
        return this.ctx.message.text;
    }

    get action() {
        return this.ctx.update['callback_query']['data']
    }

    get native() {
        return this.ctx;
    }
}

class TelegramAdapter extends AdapterBase {
    constructor(token) {
        super();

        this.bot = new Telegraf(token);
    }

    connect() {
        this.bot.startPolling();
    }

    onStart(handler) {
        this.bot.start(async ctx => {
            let conversation = new TelegramConversation(ctx);
            await handler(conversation, conversation.peer);
        });
    }

    onText(handler) {
        this.bot.hears(/.+/, async ctx => {
            let conversation = new TelegramConversation(ctx);
            await handler(conversation, conversation.text,  conversation.peer);
        });
    }

    onAction(handler) {
        this.bot.action(/.+/, async ctx => {
            let conversation = new TelegramConversation(ctx);
            await handler(conversation, conversation.action, conversation.peer);
        });
    }

    onError(handler) {
        this.bot.catch(async err => {
            await handler(err);
        });
    }

    async message(recipient, msg, extra) {
        await this.bot.sendMessage(recipient, msg, mapExtra(extra));
    }

    async messageMarkup(recipient, msg, extra) {
        await this.bot.sendMessageHTML(recipient, msg, mapExtra(extra));
    }

    get native() {
        return this.bot;
    }
}

module.exports = TelegramAdapter;