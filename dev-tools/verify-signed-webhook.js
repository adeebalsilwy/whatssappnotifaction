require('dotenv').config({ path: '.env.local' });
const app = require('express')();
const bodyParser = require('body-parser');
const { verifySignature } = require('@vonage/jwt');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true,
}));

const handleInboundMessage = (request, response) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
        console.log('Missing Authorization header');
        return response.status(401).send('Missing Authorization header');
    }

    const token = authHeader.split(' ')[1];
    const signatureSecret = process.env.VONAGE_Signature || process.env.VONAGE_SIGNATURE_SECRET;

    // Note: @vonage/jwt verifySignature might throw or return boolean depending on version/usage. 
    // Standard usage: verifySignature(token, secret)
    try {
        if (verifySignature(token, signatureSecret)) {
            console.log('Valid signature');
            response.status(200).send('OK');
        } else {
            console.log('Invalid signature');
            response.status(403).send('Invalid signature');
        }
    } catch (error) {
        console.error('Error verifying signature:', error);
        response.status(403).send('Error verifying signature');
    }
};

app
    .route('/webhooks/inbound-message')
    .post(handleInboundMessage);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Webhook verification server running on port ${port}`);
    console.log(`Using Signature Secret: ${process.env.VONAGE_Signature || process.env.VONAGE_SIGNATURE_SECRET ? '***Found***' : 'Missing'}`);
});
