const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { faunaFetch } = require('./utils/fauna');

exports.handler = async (_event, context) => {
    const { user } = context.clientContext;

    const result = await faunaFetch({
        query: `
          query ($netlifyID: ID!) {
            getUserByNetlifyID(netlifyID: $netlifyID) {
              stripeID
            }
          }
        `,
        variables: {
            netlifyID: user.sub,
        },
    });

    const { stripeID } = result.data.getUserByNetlifyID;

    // See https://stripe.com/docs/api/subscriptions/list?lang=node
    const subscriptions = await stripe.subscriptions.list({
        customer: stripeID
    });

    return {
        statusCode: 200,
        body: JSON.stringify(subscriptions.data),
    };
};