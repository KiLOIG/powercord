const webpack = require('powercord/webpack');
const {
  messages: { createBotMessage, receiveMessage },
  channels: { getChannelId }
} = webpack;

const messages = webpack.getModule(webpack.moduleFilters.messages[0]);

module.exports = async function monkeypatchMessages () {
  messages.sendMessage = (sendMessage => async (id, message, ...params) => {
    if (!message.content.startsWith(this.prefix)) {
      return sendMessage(id, message, ...params);
    }

    const [ cmd, ...args ] = message.content.slice(this.prefix.length).split(' ');
    const command = this.customCommands.find(c => c.commandAndAliases.includes(cmd));
    if (!command) {
      return sendMessage(id, message, ...params);
    }

    const result = await command.func(args, this);
    if (!result) {
      return;
    }

    if (result.send) {
      message.content = result.result;
    } else {
      const receivedMessage = createBotMessage(getChannelId(), '');

      if (typeof result.result === 'string') {
        receivedMessage.content = result.result;
      } else {
        receivedMessage.embeds.push(result.result);
      }

      return receiveMessage(receivedMessage.channel_id, receivedMessage);
    }

    return sendMessage(id, message, ...params);
  })(this.oldSendMessage = messages.sendMessage);
};
