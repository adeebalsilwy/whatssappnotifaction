require('dotenv').config({ path: '.env.local' });
const { Vonage } = require('@vonage/server-sdk');
const { Channels } = require('@vonage/messages');

const {
  VONAGE_APPLICATION_ID,
  VONAGE_PRIVATE_KEY,
  MESSAGES_SANDBOX_URL,
  WHATSAPP_SENDER_ID,
  MESSAGES_TO_NUMBER,
} = process.env;

const required = [
  'VONAGE_APPLICATION_ID',
  'VONAGE_PRIVATE_KEY',
  'MESSAGES_SANDBOX_URL',
  'WHATSAPP_SENDER_ID',
  'MESSAGES_TO_NUMBER',
];
for (const key of required) {
  if (!process.env[key] || String(process.env[key]).trim() === '') {
    console.error(`${key} is required`);
    process.exit(1);
  }
}

const vonage = new Vonage(
  {
    applicationId: VONAGE_APPLICATION_ID,
    privateKey: VONAGE_PRIVATE_KEY,
  },
  {
    apiHost: MESSAGES_SANDBOX_URL,
  }
);

vonage.messages
  .send({
    to: MESSAGES_TO_NUMBER,
    from: WHATSAPP_SENDER_ID,
    channel: Channels.WHATSAPP,
    messageType: 'text',
    text: 'This is a WhatsApp text message sent using the Vonage Messages API.',
  })
  .then((resp) => console.log(resp.messageUUID))
  .catch((error) => {
    console.error(error);
    const status = error?.response?.status;
    const retryAfter = error?.response?.headers?.['retry-after'];
    if (status === 429 && retryAfter) {
      console.error(`Retry-After: ${retryAfter}`);
    }
    process.exit(1);
  });
