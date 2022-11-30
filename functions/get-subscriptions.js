const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const {faunaFetch} = require('./utils/fauna');

exports.handler = async (_event, context) => {
    const {user} = context.clientContext;

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

    const {stripeID} = result.data.getUserByNetlifyID;

    // See https://stripe.com/docs/api/subscriptions/list?lang=node
    const subscriptions = await stripe.subscriptions.list({
        customer: stripeID
    });

    // Cache for the products
    const products = {};

    // Getting only the minimal amount of data
    const model = await Promise.all(subscriptions.data.map(async (subscription) => {
        const priceName = subscription.plan.nickname;
        const productId = subscription.plan.product;
        let product = products[productId];
        if (!product) {
            product = await stripe.products.retrieve(productId);
            products[productId] = product;
        }
        return {
            id: subscription.id,
            metadata: subscription.metadata,
            price: priceName,
            product: product.name
        };
    }));

    console.log("model = ", model);

    return {
        statusCode: 200,
        body: JSON.stringify(model),
    };
};